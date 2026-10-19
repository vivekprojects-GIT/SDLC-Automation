import * as vscode from 'vscode';
import type { LlmMessage, LlmProvider } from '@sdlc/core';
import type { ModelOption } from '@sdlc/ui/messages';

/** Our "pick the best model for me" choice. Empty, so it can never clash with a real model id (Copilot has a model whose id is "auto"). */
export const AUTO = '';

/** Models Copilot lists but rejects for this account ("model_not_supported"), remembered for this session. */
const notEnabled = new Set<string>();

// Writing long, structured documents needs a capable model: skip routers such as Copilot's own "Auto",
// avoid "mini"/"nano" models, then prefer the largest context.
const isRouter = (m: vscode.LanguageModelChat) => /^auto$/i.test(m.id) || /^auto$/i.test(m.family) || /^auto$/i.test(m.name);
const isSmall = (m: vscode.LanguageModelChat) => /mini|nano|flash|haiku/i.test(`${m.family} ${m.name}`);

/** Copilot's internal helper models (ids like copilot-utility-small, copilot-dictation-cleanup-luna) are not for writing documents. */
const isInternal = (m: vscode.LanguageModelChat) => /^copilot-/i.test(m.id);

async function documentModels(): Promise<vscode.LanguageModelChat[]> {
  return (await vscode.lm.selectChatModels({ vendor: 'copilot' })).filter((m) => !isInternal(m));
}

/** Models in the order Auto tries them. Copilot's own router comes last, as a fallback. */
function ranked(models: readonly vscode.LanguageModelChat[]): vscode.LanguageModelChat[] {
  // Big named models first, then Copilot's own router (it picks a capable model for us), small models last.
  const tier = (m: vscode.LanguageModelChat) => (isRouter(m) ? 1 : isSmall(m) ? 2 : 0);
  return [...models].filter((m) => !notEnabled.has(m.id)).sort((a, b) => tier(a) - tier(b) || b.maxInputTokens - a.maxInputTokens);
}

/** The Copilot models this account can use, for the model picker, and the one Auto would choose. */
export async function listCopilotModels(): Promise<{ models: ModelOption[]; autoModel?: string }> {
  if (!vscode.workspace.isTrusted) return { models: [] };
  const models = await documentModels();
  const options = models
    .map((m) => ({ id: m.id, name: m.name, family: m.family, maxInputTokens: m.maxInputTokens, enabled: !notEnabled.has(m.id) }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return { models: options, autoModel: ranked(models)[0]?.name };
}

/** Copilot lists some models it will not serve to extensions: not enabled on the plan, or kept for VS Code's own features. */
const isNotSupported = (err: unknown) =>
  /model_not_supported|model is not supported|not supported for this|only available to vs code core|only available to/i.test(err instanceof Error ? err.message : String(err));

/**
 * GitHub Copilot through VS Code's Language Model API. Needs Copilot signed in; VS Code asks
 * once whether this extension may use it. `choice` returns a model id from the picker, or AUTO.
 */
export class CopilotProvider implements LlmProvider {
  readonly name = 'GitHub Copilot';
  private lastModel?: string;
  private lastImages = { sent: 0, dropped: 0 };

  constructor(
    private readonly choice: () => string,
    /** Called when a model turns out not to be enabled, so the picker can be refreshed. */
    private readonly onModelRejected: () => void = () => {},
  ) {}

  /** The model, plus how many Figma images went with the request, for the audit log. */
  describeModel(): string | undefined {
    if (!this.lastModel) return undefined;
    const { sent, dropped } = this.lastImages;
    const images = sent ? `, ${sent} image(s) attached` : dropped ? `, ${dropped} image(s) not attached: this VS Code cannot send images` : '';
    return `${this.lastModel}${images}`;
  }

  async contextLimit(): Promise<number | undefined> {
    return (await this.candidates())[0]?.maxInputTokens;
  }

  /** The picked model, or for Auto every usable model in the order to try them. */
  private async candidates(): Promise<vscode.LanguageModelChat[]> {
    if (!vscode.workspace.isTrusted) {
      throw new Error('Copilot is turned off because this folder is in Restricted Mode. Click "Manage" in the Restricted Mode bar at the top, choose Trust, then run the step again.');
    }
    const id = this.choice();
    if (id !== AUTO) {
      const [picked] = await vscode.lm.selectChatModels({ vendor: 'copilot', id });
      if (!picked) throw new Error(`The model you picked (${id}) is not available any more. Pick another model, or Auto, in the model list at the top.`);
      return [picked];
    }
    const models = ranked(await documentModels());
    if (!models.length) throw new Error('No GitHub Copilot model is available. Sign in to GitHub Copilot in VS Code (Accounts menu), then try again.');
    return models;
  }

  async complete(messages: LlmMessage[], options?: { signal?: AbortSignal }): Promise<string> {
    const auto = this.choice() === AUTO;
    const candidates = await this.candidates();
    for (const model of candidates) {
      try {
        return await this.send(model, messages, options);
      } catch (err) {
        if (!isNotSupported(err)) throw err;
        notEnabled.add(model.id);
        this.onModelRejected();
        if (!auto) {
          throw new Error(`GitHub Copilot lists ${model.name}, but does not let extensions use it (it is not enabled for your account, or kept for VS Code's own features). Pick another model, or Auto, in the model list at the top.`);
        }
        // Auto: move on to the next model.
      }
    }
    throw new Error('None of the GitHub Copilot models available to you accepted the request. Check your Copilot plan, or ask an admin which models are enabled.');
  }

  private async send(model: vscode.LanguageModelChat, messages: LlmMessage[], options?: { signal?: AbortSignal }): Promise<string> {
    const source = new vscode.CancellationTokenSource();
    options?.signal?.addEventListener('abort', () => source.cancel());

    // The Language Model API has no system role: the instructions go first as a user message.
    const DataPart = (vscode as any).LanguageModelDataPart;
    const imageCount = messages.reduce((n, m) => n + (m.images?.length ?? 0), 0);
    this.lastImages = DataPart?.image ? { sent: imageCount, dropped: 0 } : { sent: 0, dropped: imageCount };
    const chat = messages.map((m) => {
      if (m.role === 'assistant') return vscode.LanguageModelChatMessage.Assistant(m.content);
      const text = m.role === 'system' ? `Instructions:\n\n${m.content}` : m.content;
      if (m.images?.length && DataPart?.image) {
        return vscode.LanguageModelChatMessage.User([new vscode.LanguageModelTextPart(text), ...m.images.map((i) => DataPart.image(i.data, i.mimeType))]);
      }
      const skipped = m.images?.length ? `\n\n(${m.images.length} Figma image(s) could not be attached in this VS Code version.)` : '';
      return vscode.LanguageModelChatMessage.User(text + skipped);
    });

    try {
      const response = await model.sendRequest(chat, { justification: 'SDLC CAPM writes PDLC deliverables from your project inputs.' }, source.token);
      let out = '';
      for await (const part of response.text) out += part;
      this.lastModel = `${model.vendor}/${model.family}`;
      return out;
    } catch (err) {
      if (isNotSupported(err)) throw err;
      if (err instanceof vscode.LanguageModelError) {
        if (err.code === vscode.LanguageModelError.NoPermissions.name) throw new Error('VS Code did not allow this extension to use Copilot. Run the step again and choose Allow.');
        if (err.code === vscode.LanguageModelError.Blocked.name) throw new Error('Copilot refused the request or hit a rate limit. Wait a moment and try again, or pick another model.');
        if (err.code === vscode.LanguageModelError.NotFound.name) throw new Error('The selected Copilot model is no longer available. Pick another model, or Auto, in the model list at the top.');
        throw new Error(`Copilot error: ${err.message}`);
      }
      throw err;
    } finally {
      source.dispose();
    }
  }
}
