import { randomBytes } from 'node:crypto';
import { accessSync, promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as vscode from 'vscode';
import { Pipeline, PipelineError, listProjects, type LlmProvider } from '@sdlc/core';
import type { HostToUi, UiToHost } from '@sdlc/ui/messages';
import { AUTO, CopilotProvider, listCopilotModels } from './copilot-provider';

/**
 * The bridge between the screens (a webview) and the workflow engine. It holds no workflow
 * logic of its own: it turns UI messages into Pipeline calls and sends the new state back.
 */
export class SdlcPanel {
  private static current: SdlcPanel | undefined;
  private pipeline?: Pipeline;
  private readonly disposables: vscode.Disposable[] = [];

  static show(context: vscode.ExtensionContext): void {
    if (SdlcPanel.current) {
      SdlcPanel.current.panel.reveal();
      return;
    }
    const root = findToolRoot();
    if (!root) {
      void vscode.window.showErrorMessage('Open the sdlc-automation folder in VS Code first. It must contain content/stages and projects/.');
      return;
    }
    const panel = vscode.window.createWebviewPanel('sdlcAutomation', 'SDLC Automation', vscode.ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
    });
    SdlcPanel.current = new SdlcPanel(context, panel, root);
  }

  private constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly panel: vscode.WebviewPanel,
    private readonly toolRoot: string,
  ) {
    panel.webview.html = this.html();
    panel.webview.onDidReceiveMessage((m: UiToHost) => void this.handle(m), null, this.disposables);
    panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // A reviewer who edits a draft in the editor: pick up the change on save.
    vscode.workspace.onDidSaveTextDocument(async (doc) => {
      const key = this.pipeline?.stageForFile(doc.uri.fsPath);
      if (key && (await this.pipeline!.syncEdits(key, this.actor()))) await this.postState();
    }, null, this.disposables);

    // The CLI or Copilot chat may change the state or the inputs while the panel is open.
    const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(toolRoot, 'projects/**'));
    let timer: NodeJS.Timeout | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        if (!this.pipeline || this.pipeline.isBusy) return;
        await this.pipeline.reload();
        await this.postState();
      }, 400);
    };
    watcher.onDidChange(refresh, null, this.disposables);
    watcher.onDidCreate(refresh, null, this.disposables);
    watcher.onDidDelete(refresh, null, this.disposables);
    this.disposables.push(watcher);

    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('sdlcAutomation')) {
        this.pipeline?.setProvider(this.provider());
        void this.postSession();
      }
    }, null, this.disposables);

    // Models come and go as the user signs in, trusts the folder or their plan changes.
    vscode.lm.onDidChangeChatModels(() => void this.postSession(), null, this.disposables);
    vscode.workspace.onDidGrantWorkspaceTrust(() => void this.postSession(), null, this.disposables);
  }

  private modelChoice(): string {
    return this.config().get<string>('model', AUTO).trim();
  }

  private config() {
    return vscode.workspace.getConfiguration('sdlcAutomation');
  }

  private provider(): LlmProvider {
    return new CopilotProvider(() => this.modelChoice(), () => void this.postSession());
  }

  private actor() {
    return { name: this.config().get<string>('reviewerName', '') || os.userInfo().username };
  }

  private post(message: HostToUi): void {
    void this.panel.webview.postMessage(message);
  }

  private async postSession(selected?: string): Promise<void> {
    const projects = await listProjects(this.toolRoot);
    const provider = this.provider();
    let models: Awaited<ReturnType<typeof listCopilotModels>> = { models: [] };
    if (provider instanceof CopilotProvider) {
      try {
        models = await listCopilotModels();
      } catch {
        /* Copilot not ready yet; the list fills in when it is */
      }
    }
    this.post({
      type: 'session',
      projects: projects.map((p) => ({ id: p.id, name: p.name })),
      selected: selected ?? this.pipeline?.project.id,
      provider: provider.name,
      reviewer: this.actor().name,
      autoAdvance: this.config().get<boolean>('autoAdvance', true),
      models: models.models,
      model: this.modelChoice(),
      autoModel: models.autoModel,
    });
  }

  private async postState(): Promise<void> {
    if (this.pipeline) this.post({ type: 'state', snapshot: await this.pipeline.snapshot() });
  }

  private async openProject(id?: string): Promise<void> {
    const projects = await listProjects(this.toolRoot);
    const remembered = this.context.workspaceState.get<string>('sdlcAutomation.project');
    const chosen = projects.find((p) => p.id === id) ?? projects.find((p) => p.id === remembered) ?? projects[0];
    if (!chosen) {
      await this.postSession();
      return;
    }
    await this.context.workspaceState.update('sdlcAutomation.project', chosen.id);
    this.pipeline = await Pipeline.open({
      toolRoot: this.toolRoot,
      projectDir: chosen.dir,
      provider: this.provider(),
      onEvent: (e) => {
        if (e.type === 'progress') this.post({ type: 'progress', stage: e.stage, message: e.message });
        else void this.postState();
      },
    });
    await this.postSession(chosen.id);
    await this.postState();
  }

  private async handle(m: UiToHost): Promise<void> {
    try {
      if (m.type === 'ready') return await this.openProject();
      if (m.type === 'selectProject') return await this.openProject(m.id);
      if (m.type === 'selectModel') {
        // A personal choice, so it goes in the user's settings rather than the shared repo.
        await this.config().update('model', m.id === AUTO ? undefined : m.id, vscode.ConfigurationTarget.Global);
        this.post({ type: 'notice', message: m.id === AUTO ? 'Model: Auto. The most capable available model writes each document.' : 'Model saved. The next document will be written with it.' });
        return;
      }
      const p = this.pipeline;
      if (!p) throw new PipelineError('No project is open.');
      const actor = this.actor();
      switch (m.type) {
        case 'run':
          await p.run(m.stage);
          break;
        case 'approve': {
          const next = await p.approve(m.stage, actor);
          await this.postState();
          if (next && this.config().get<boolean>('autoAdvance', true)) await p.run(next);
          break;
        }
        case 'sendBack':
          await p.sendBack(m.stage, m.comment, actor);
          break;
        case 'answer':
          await p.answer(m.questionId, m.value, actor);
          break;
        case 'resolve':
          await p.resolve(m.stage, m.itemId, m.decision, actor);
          break;
        case 'reopen':
          await p.reopen(m.stage, actor);
          break;
        case 'openDocument':
          await this.openFile(p.documentPath(m.stage));
          return;
        case 'openFile':
          await this.openFile(path.join(p.project.dir, m.rel));
          return;
        case 'addInputs':
          await this.addInputs(p.project.dir);
          break;
        case 'openInputs':
          await vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(path.join(p.project.dir, 'inputs')));
          return;
        case 'export':
          this.post({ type: 'exported', result: await p.exportAll(actor) });
          break;
        case 'copy':
          await vscode.env.clipboard.writeText(m.text);
          this.post({ type: 'notice', message: 'Copied to the clipboard.' });
          return;
      }
      await this.postState();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.post({ type: 'error', message, details: err instanceof PipelineError ? err.details : undefined });
      await this.postState();
    }
  }

  private async openFile(file: string): Promise<void> {
    const uri = vscode.Uri.file(file);
    if (file.toLowerCase().endsWith('.md')) await vscode.window.showTextDocument(uri, { viewColumn: vscode.ViewColumn.Beside, preview: false });
    else await vscode.commands.executeCommand('vscode.open', uri, vscode.ViewColumn.Beside);
  }

  private async addInputs(projectDir: string): Promise<void> {
    const picked = await vscode.window.showOpenDialog({
      canSelectMany: true,
      openLabel: 'Add to inputs',
      filters: { 'Requirement inputs': ['md', 'txt', 'csv', 'docx', 'xlsx', 'xls', 'json', 'png', 'jpg', 'jpeg'], 'All files': ['*'] },
    });
    if (!picked?.length) return;
    for (const uri of picked) {
      const isImage = /\.(png|jpe?g)$/i.test(uri.fsPath);
      const dir = path.join(projectDir, 'inputs', ...(isImage ? ['figma'] : []));
      await fs.mkdir(dir, { recursive: true });
      await fs.copyFile(uri.fsPath, path.join(dir, path.basename(uri.fsPath)));
    }
    this.post({ type: 'notice', message: `Added ${picked.length} file(s). Images went to inputs/figma.` });
  }

  private html(): string {
    const webview = this.panel.webview;
    const media = (f: string) => webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', f));
    const nonce = randomBytes(16).toString('base64');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} data:; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${media('ui.css')}">
<title>SDLC Automation</title>
</head>
<body>
<div id="app"></div>
<script nonce="${nonce}" src="${media('ui.js')}"></script>
</body>
</html>`;
  }

  private dispose(): void {
    SdlcPanel.current = undefined;
    while (this.disposables.length) this.disposables.pop()?.dispose();
  }
}

function findToolRoot(): string | undefined {
  for (const f of vscode.workspace.workspaceFolders ?? []) {
    try {
      accessSync(path.join(f.uri.fsPath, 'content', 'stages'));
      return f.uri.fsPath;
    } catch {
      /* not the repo */
    }
  }
  return undefined;
}
