import { promises as fs } from 'node:fs';
import path from 'node:path';
import { loadChecklist, loadStageContent, loadTemplate, loadWordStyles, type StageContent } from '../content';
import { fitInputs, messageTokens } from '../context/budget';
import { listInputs, readInputs, type InputFile } from '../context/inputs';
import { buildMessages, type PromptInput, type UpstreamDoc } from '../context/prompt';
import { docFile, hashBody, readDoc, relToProject, writeDoc } from '../documents';
import { PipelineError } from '../errors';
import { markdownToWorkbook, rtmToExcel } from '../export/excel';
import { markdownToWord, type DeliverableMeta } from '../export/word';
import { appendAudit, readAudit } from '../governance/audit';
import { emptyStage, loadState, saveState, type PipelineState, type StageState } from '../governance/state';
import { FIRST_DRAFT, approvedVersion, nextRevision } from '../governance/versions';
import { runChecks } from '../guardrails/checks';
import { parseQuestions } from '../guardrails/questions';
import type { LlmMessage, LlmProvider } from '../llm/provider';
import { loadProject, type ProjectConfig } from '../project';
import { STAGES, type StageKey } from '../stages/registry';
import { buildMatrix, coverageOf, matrixToCsv, matrixToMarkdown, type TraceDocs } from '../trace/matrix';
import type { Actor, ExportResult, PipelineSnapshot, Resolution, StageSnapshot, StageStatus } from '../types';
import { ID_PATTERN } from '../util/ids';
import { cleanOutput, setTableCell } from '../util/markdown';
import { reviseDocument, writeDocument, type WriteContext } from './writer';

export interface PipelineOptions {
  /** The repo root: the folder with content/ and projects/. */
  toolRoot: string;
  projectDir: string;
  provider?: LlmProvider;
  onEvent?: (event: PipelineEvent) => void;
  clock?: () => Date;
}

export type PipelineEvent = { type: 'progress'; stage: StageKey; message: string } | { type: 'changed' };

const STATUS_WORDS: Record<StageStatus, string> = {
  locked: 'waiting for the step before it to be approved',
  ready: 'ready to run',
  running: 'running',
  review: 'waiting for review',
  approved: 'already approved',
  stale: 'out of date because an earlier document changed',
};

/** The RTM, kept beside the documents for review in the editor; the Planview/PPP copies go to outputs/deliverables/. */
const RTM_FILES = ['outputs/rtm.md', 'outputs/rtm.csv'];
const DELIVERABLES = 'outputs/deliverables';
const DEFAULT_INPUT_TOKENS = 60_000;
const QUALITY_CEILING = 128_000;

/** What a reviewer decided about, in words: "FR-06", "Accessibility", or the intake fact itself. */
function readableItem(itemId: string, message?: string): string {
  if (itemId.startsWith('checklist:')) return `checklist topic: ${itemId.slice('checklist:'.length)}`;
  if (itemId.startsWith('fact:')) return `intake fact: ${message?.match(/"([^"]+)"/)?.[1] ?? 'see the BRD checks'}`;
  return itemId;
}

/** The audit note for a draft: the model, and whether it took pieces or automatic gap filling. */
function writeNote(model: string | undefined, pieces: number, filled: string[]): string {
  return [model, pieces > 1 ? `written in ${pieces} pieces` : '', filled.length ? `missing items written automatically for ${filled.join(', ')}` : '']
    .filter(Boolean)
    .join('; ');
}

/**
 * The SDLC workflow for one project. It has no UI and no VS Code code: the extension,
 * the CLI and the tests all drive it through these methods.
 */
export class Pipeline {
  private running: StageKey | null = null;
  private busy = false;
  /** The chosen model's input limit while a step runs; requests stay below it as well as below the project budget. */
  private modelLimit?: number;

  /**
   * The most one request may send: 80% of the chosen model's limit (at most QUALITY_CEILING, as very
   * long prompts make models follow templates less well), lowered further by budget.maxInputTokens
   * if the project sets one. Without a known model (the Copilot chat path), DEFAULT_INPUT_TOKENS.
   */
  private get maxTokens(): number {
    const cap = this.project.budget.maxInputTokens;
    const fromModel = this.modelLimit ? Math.min(Math.floor(this.modelLimit * 0.8), QUALITY_CEILING) : undefined;
    if (cap !== undefined && fromModel !== undefined) return Math.min(cap, fromModel);
    return cap ?? fromModel ?? DEFAULT_INPUT_TOKENS;
  }

  private writeContext(key: StageKey, base: PromptInput, provider: LlmProvider): WriteContext {
    return {
      key,
      base,
      provider,
      maxTokens: this.maxTokens,
      maxOutputTokens: this.project.budget.maxOutputTokens,
      chunkSize: this.project.budget.chunkSize,
      progress: (m) => this.progress(key, m),
    };
  }

  private async useModelLimit(provider: LlmProvider): Promise<void> {
    try {
      this.modelLimit = await provider.contextLimit?.();
    } catch {
      this.modelLimit = undefined;
    }
  }

  private constructor(
    private readonly opts: PipelineOptions,
    public project: ProjectConfig,
    private state: PipelineState,
  ) {}

  static async open(opts: PipelineOptions): Promise<Pipeline> {
    const project = await loadProject(opts.projectDir);
    const pipeline = new Pipeline(opts, project, await loadState(project.dir));
    await pipeline.refreshChecks();
    return pipeline;
  }

  /** Re-reads project.yaml and the saved state, e.g. after the CLI changed them. */
  async reload(): Promise<void> {
    if (this.busy) return;
    this.project = await loadProject(this.opts.projectDir);
    this.state = await loadState(this.project.dir);
    await this.refreshChecks();
  }

  /** Re-runs the checks of drafts in review, so edits to templates or the checklist apply at once. Kept in memory only. */
  private async refreshChecks(): Promise<void> {
    for (const key of this.order) {
      if (this.state.stages[key]?.status === 'review') {
        try {
          await this.check(key);
        } catch {
          /* keep the saved checks if content is missing */
        }
      }
    }
  }

  setProvider(provider: LlmProvider | undefined): void {
    this.opts.provider = provider;
  }

  get isBusy(): boolean {
    return this.busy;
  }

  get order(): StageKey[] {
    return this.project.stageOrder;
  }

  status(key: StageKey): StageStatus {
    if (this.running === key) return 'running';
    const stored = this.state.stages[key]?.status;
    if (stored) return stored;
    return this.priorApproved(key) ? 'ready' : 'locked';
  }

  nextRunnable(): StageKey | undefined {
    return this.order.find((k) => {
      const s = this.status(k);
      return s === 'ready' || (s === 'stale' && this.priorApproved(k));
    });
  }

  documentPath(key: StageKey): string {
    return docFile(this.project, key);
  }

  async readDocument(key: StageKey): Promise<string | undefined> {
    return (await readDoc(this.documentPath(key)))?.body;
  }

  /** The stage whose document lives at this path, if any. */
  stageForFile(file: string): StageKey | undefined {
    const target = path.resolve(file).toLowerCase();
    return this.order.find((k) => path.resolve(this.documentPath(k)).toLowerCase() === target);
  }

  // ---------------------------------------------------------------- actions

  /** Writes the first draft of a step (or a fresh draft of a stale one). */
  run(requested?: StageKey): Promise<StageKey> {
    return this.exclusive(async () => {
      const key = requested ?? this.nextRunnable();
      if (!key) throw new PipelineError('Nothing to run. Every step is approved or waiting for review.');
      const def = STAGES[key];
      const status = this.status(key);
      if (status !== 'ready' && status !== 'stale') throw new PipelineError(`${def.title} can't run: it is ${STATUS_WORDS[status]}.`);
      if (!this.priorApproved(key)) throw new PipelineError(`${def.title} can't run until every step before it is approved.`);
      const provider = this.requireProvider();
      await this.useModelLimit(provider);

      this.running = key;
      this.emit({ type: 'changed' });
      try {
        const { content, upstream, inputs, notes } = await this.gather(key);
        this.progress(key, `Writing the ${def.docTitle} with ${provider.name}`);
        const base: PromptInput = { def, mode: 'draft', content, project: this.project, upstream, inputs, removed: this.removedIds() };
        const { body, pieces, filled } = await writeDocument(this.writeContext(key, base, provider));

        const st = this.stage(key);
        const version = status === 'stale' && st.version ? nextRevision(st.version) : FIRST_DRAFT;
        if (status !== 'stale') Object.assign(st, emptyStage());
        Object.assign(st, { status: 'review', version, notes, approvedBy: undefined, approvedAt: undefined });
        const model = provider.describeModel?.();
        const note = writeNote(model, pieces, filled);
        await this.writeBody(key, body, 'draft', `${def.agentTitle} via ${provider.name}${model ? ` (${model})` : ''}`);
        st.history.push({ version, action: 'generated', by: def.agentTitle, at: this.now(), note: note || undefined });

        this.progress(key, 'Running the guardrail checks');
        await this.check(key);
        await this.audit(key, 'generated', def.agentTitle, version, `Draft written with ${provider.name}${note ? ` (${note})` : ''}`);
        await this.persist();
        return key;
      } finally {
        this.running = null;
        this.modelLimit = undefined;
        this.emit({ type: 'changed' });
      }
    });
  }

  /** Sends a draft back with a comment; the agent revises it and it returns for review. */
  sendBack(key: StageKey, comment: string, actor: Actor): Promise<void> {
    return this.exclusive(async () => {
      const def = STAGES[key];
      if (this.status(key) !== 'review') throw new PipelineError(`${def.title} can't be sent back: it is ${STATUS_WORDS[this.status(key)]}.`);
      const text = comment.trim();
      if (!text) throw new PipelineError('Write what should change before sending the document back.');
      const provider = this.requireProvider();
      await this.useModelLimit(provider);
      await this.syncEditsInner(key, actor);
      const st = this.stage(key);
      await this.audit(key, 'sent back', actor.name, st.version!, text);

      this.running = key;
      this.emit({ type: 'changed' });
      try {
        this.progress(key, 'Reading the reviewer comment');
        const { content, upstream, inputs, notes } = await this.gather(key);
        const current = (await this.readDocument(key)) ?? '';
        const base: PromptInput = { def, mode: 'revise', content, project: this.project, upstream, inputs, removed: this.removedIds(), current, comment: text };
        this.progress(key, `Revising the document with ${provider.name}`);
        const { body, filled } = await reviseDocument(this.writeContext(key, base, provider), buildMessages(base));

        const version = nextRevision(st.version!);
        Object.assign(st, { version, notes });
        await this.writeBody(key, body, 'draft');
        const extra = filled.length ? `; missing items written automatically for ${filled.join(', ')}` : '';
        st.history.push({ version, action: 'revised', by: def.agentTitle, at: this.now(), note: `For the comment: "${text}"${extra}` });
        this.progress(key, 'Running the guardrail checks');
        await this.check(key);
        await this.audit(key, 'revised', def.agentTitle, version, `Revised for the ${this.project.owners[key]}'s comment${extra}`);
        await this.persist();
      } finally {
        this.running = null;
        this.modelLimit = undefined;
        this.emit({ type: 'changed' });
      }
    });
  }

  /** Approves a draft. Refuses while any guardrail blocks. Returns the step that can run next. */
  approve(key: StageKey, actor: Actor): Promise<StageKey | undefined> {
    return this.exclusive(async () => {
      const def = STAGES[key];
      if (this.status(key) !== 'review') throw new PipelineError(`${def.title} can't be approved: it is ${STATUS_WORDS[this.status(key)]}.`);
      await this.syncEditsInner(key, actor);
      await this.check(key);
      const st = this.stage(key);
      const blocks = st.checks.filter((c) => c.level === 'block');
      if (blocks.length) {
        await this.persist();
        throw new PipelineError(`${def.title} can't be approved until these are fixed:`, blocks.map((b) => b.message));
      }

      let body = (await this.readDocument(key)) ?? '';
      if (key === 'intake') {
        for (const [qid, answer] of Object.entries(st.answers)) {
          if (answer.trim()) body = setTableCell(body, qid, (h) => h.toLowerCase() === 'answer', answer);
        }
      }
      for (const [id, decision] of Object.entries(st.resolutions)) {
        if (decision === 'remove' && new RegExp(`^${ID_PATTERN.source}$`).test(id)) body = setTableCell(body, id, (h) => /^(?:[a-z]+ )?id$/i.test(h), `~~${id}~~`); // "ID", "BRD ID", "FDD ID"…
      }

      const version = approvedVersion(st.version!);
      Object.assign(st, { status: 'approved', version, approvedBy: `${actor.name} (${this.project.owners[key]})`, approvedAt: this.now() });
      await this.writeBody(key, body, 'approved');
      st.history.push({ version, action: 'approved', by: st.approvedBy!, at: st.approvedAt! });
      await this.audit(key, 'approved', st.approvedBy!, version, '');
      await this.persist();
      this.emit({ type: 'changed' });
      return this.nextRunnable();
    });
  }

  /** Records the reviewer's answer to an intake question. */
  answer(questionId: string, value: string, actor: Actor): Promise<void> {
    return this.exclusive(async () => {
      if (this.status('intake') !== 'review') throw new PipelineError('Questions can only be answered while the intake summary is in review.');
      const st = this.stage('intake');
      if ((st.answers[questionId] ?? '') === value.trim()) return;
      st.answers[questionId] = value.trim();
      await this.check('intake');
      await this.audit('intake', 'answered', actor.name, st.version!, `${questionId}: ${value.trim() || '(cleared)'}`);
      await this.persist();
      this.emit({ type: 'changed' });
    });
  }

  /** Settles a guardrail that needs a decision: keep or remove an item without a source, or waive a checklist topic. */
  resolve(key: StageKey, itemId: string, decision: Resolution, actor: Actor): Promise<void> {
    return this.exclusive(async () => {
      if (this.status(key) !== 'review') throw new PipelineError(`${STAGES[key].title} is not in review.`);
      const st = this.stage(key);
      const check = st.checks.find((c) => c.itemId === itemId);
      if (check?.options && !check.options.includes(decision)) throw new PipelineError(`"${decision}" is not an option for ${itemId}.`);
      st.resolutions[itemId] = decision;
      await this.check(key);
      const action = { keep: 'kept', remove: 'removed', waive: 'waived' }[decision];
      await this.audit(key, action, actor.name, st.version!, readableItem(itemId, check?.message));
      await this.persist();
      this.emit({ type: 'changed' });
    });
  }

  /** Reopens an approved document for changes. Every later step becomes stale. */
  reopen(key: StageKey, actor: Actor, reason = ''): Promise<void> {
    return this.exclusive(async () => {
      const def = STAGES[key];
      if (this.status(key) !== 'approved') throw new PipelineError(`${def.title} is not approved, so there is nothing to reopen.`);
      const st = this.stage(key);
      const version = nextRevision(st.version!);
      Object.assign(st, { status: 'review', version, approvedBy: undefined, approvedAt: undefined });
      await this.writeBody(key, (await this.readDocument(key)) ?? '', 'draft');
      st.history.push({ version, action: 'reopened', by: actor.name, at: this.now(), note: reason || undefined });
      await this.audit(key, 'reopened', actor.name, version, reason);
      for (const later of this.order.slice(this.order.indexOf(key) + 1)) {
        const ls = this.state.stages[later];
        if (ls?.status === 'approved' || ls?.status === 'review') {
          ls.status = 'stale';
          ls.history.push({ version: ls.version ?? '', action: 'marked stale', by: 'Pipeline', at: this.now(), note: `${def.title} was reopened` });
          await this.audit(later, 'marked stale', 'Pipeline', ls.version ?? '', `${def.title} was reopened`);
        }
      }
      await this.check(key);
      await this.persist();
      this.emit({ type: 'changed' });
    });
  }

  /**
   * For the Copilot chat path: the chat wrote the document file itself, so register it
   * as a new draft or revision, version it and run the guardrails.
   */
  register(key: StageKey, actor: Actor): Promise<void> {
    return this.exclusive(async () => {
      const def = STAGES[key];
      const status = this.status(key);
      if (status === 'locked') throw new PipelineError(`${def.title} can't start until the step before it is approved.`);
      if (status === 'approved') throw new PipelineError(`${def.title} is already approved. Reopen it first.`);
      const doc = await readDoc(this.documentPath(key));
      const rel = relToProject(this.project, this.documentPath(key));
      if (!doc?.body.trim()) throw new PipelineError(`No document found at ${rel}.`, ['Write the document to that file, then register it again.']);
      const st = this.stage(key);
      const fresh = status === 'ready';
      const version = fresh ? FIRST_DRAFT : nextRevision(st.version ?? '0.0');
      if (fresh) Object.assign(st, emptyStage());
      Object.assign(st, { status: 'review', version, notes: [] });
      await this.writeBody(key, cleanOutput(doc.body), 'draft', `${def.agentTitle} via ${actor.name}`);
      st.history.push({ version, action: fresh ? 'generated' : 'revised', by: actor.name, at: this.now() });
      await this.check(key);
      await this.audit(key, fresh ? 'generated' : 'revised', actor.name, version, 'Registered a document written in Copilot chat');
      await this.persist();
      this.emit({ type: 'changed' });
    });
  }

  /** Picks up direct edits a reviewer made to a draft in the editor. */
  async syncEdits(key: StageKey, actor: Actor): Promise<boolean> {
    if (this.busy) return false;
    return this.exclusive(() => this.syncEditsInner(key, actor));
  }

  /**
   * Writes every approved deliverable for Planview/PPP (the BRD, FDD and DSD as Excel workbooks with
   * one tab per section, the others as Word) and the RTM with its Transition to BAU plan. Needs every step approved.
   */
  exportAll(actor: Actor): Promise<ExportResult> {
    return this.exclusive(async () => {
      const pending = this.order.filter((k) => this.status(k) !== 'approved');
      if (pending.length) throw new PipelineError('Export needs every document approved first.', pending.map((k) => `${STAGES[k].title} is ${STATUS_WORDS[this.status(k)]}.`));
      const matrix = buildMatrix(await this.traceDocs(), this.removedIds());
      const coverage = coverageOf(matrix);
      const at = this.now();
      const out = (rel: string) => path.join(this.project.dir, rel);
      await fs.mkdir(out(DELIVERABLES), { recursive: true });
      await this.writeFile(RTM_FILES[0], matrixToMarkdown(matrix, this.project.name, at));
      await this.writeFile(RTM_FILES[1], matrixToCsv(matrix));

      const files: string[] = [];
      const styles = await loadWordStyles(this.opts.toolRoot, this.project.templatePack);
      for (const key of this.order) {
        const def = STAGES[key];
        const doc = await readDoc(this.documentPath(key));
        if (!doc) continue;
        const meta = this.deliverableMeta(key, doc.meta);
        const rel = this.deliverablePath(key);
        await this.writeFile(rel, def.exportAs === 'excel' ? markdownToWorkbook(doc.body, meta) : await markdownToWord(doc.body, meta, { styles }));
        files.push(rel);
      }
      const rtm = `${DELIVERABLES}/rtm.xlsx`;
      await this.writeFile(rtm, rtmToExcel(matrix, coverage, this.project.name, at));
      files.push(rtm);

      await this.audit('export', 'exported', actor.name, '', `${files.length} deliverables; ${coverage.fullyTraced} of ${coverage.requirements} requirements fully traced`);
      this.emit({ type: 'changed' });
      return { files, matrix, coverage };
    });
  }

  /** Where a step's Planview/PPP copy is written: outputs/deliverables/<same name>.docx or .xlsx. */
  deliverablePath(key: StageKey): string {
    const md = path.basename(this.documentPath(key));
    return `${DELIVERABLES}/${md.replace(/\.md$/, STAGES[key].exportAs === 'excel' ? '.xlsx' : '.docx')}`;
  }

  private deliverableMeta(key: StageKey, m: Record<string, unknown>): DeliverableMeta {
    const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
    return {
      document: str(m.document) ?? STAGES[key].docTitle,
      project: str(m.project) ?? this.project.name,
      version: str(m.version),
      status: str(m.status),
      owner: str(m.owner) ?? this.project.owners[key],
      writtenBy: str(m.generated_by),
      approvedBy: str(m.approved_by),
      approvedAt: str(m.approved_at),
      template: str(m.template),
    };
  }

  private async writeFile(rel: string, data: string | Buffer): Promise<void> {
    const file = path.join(this.project.dir, rel);
    try {
      await fs.writeFile(file, data);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'EBUSY' || code === 'EPERM') throw new PipelineError(`${path.basename(file)} is open in another program. Close it, then export again.`);
      throw err;
    }
  }

  /** The approved (or current) documents the trace is built from. */
  private async traceDocs(): Promise<TraceDocs> {
    return {
      brd: await this.readDocument('brd'),
      fdd: await this.readDocument('fdd'),
      dsd: await this.readDocument('dsd'),
      tdd: await this.readDocument('tdd'),
      sit: await this.readDocument('sit-strategy'),
      uat: await this.readDocument('uat-strategy'),
    };
  }

  /** The full prompt for one step, for the Copilot chat path (`sdlc prompt`). */
  async promptFor(key: StageKey, comment?: string): Promise<{ messages: LlmMessage[]; file: string }> {
    const def = STAGES[key];
    const { content, upstream, inputs } = await this.gather(key);
    const messages = comment
      ? buildMessages({ def, mode: 'revise', content, project: this.project, upstream, inputs, removed: this.removedIds(), current: (await this.readDocument(key)) ?? '', comment })
      : buildMessages({ def, mode: 'draft', content, project: this.project, upstream, inputs, removed: this.removedIds() });
    return { messages, file: relToProject(this.project, this.documentPath(key)) };
  }

  /** Everything a UI needs to draw the current state. */
  async snapshot(): Promise<PipelineSnapshot> {
    const documents: PipelineSnapshot['documents'] = {};
    const stages: StageSnapshot[] = [];
    for (const key of this.order) {
      const def = STAGES[key];
      const st = this.state.stages[key];
      const status = this.status(key);
      const body = st?.status ? await this.readDocument(key) : undefined;
      if (body !== undefined) documents[key] = body;
      const checks = st?.checks ?? [];
      const snap: StageSnapshot = {
        key,
        title: def.title,
        docTitle: def.docTitle,
        owner: this.project.owners[key],
        agent: def.agentTitle,
        status,
        version: st?.version,
        file: relToProject(this.project, this.documentPath(key)),
        hasDocument: body !== undefined,
        checks,
        canApprove: status === 'review' && !checks.some((c) => c.level === 'block'),
        approvedBy: st?.approvedBy,
        approvedAt: st?.approvedAt,
        history: st?.history ?? [],
        exportAs: def.exportAs,
        deliverable: this.deliverablePath(key),
      };
      if (key === 'intake' && body) snap.questions = parseQuestions(body).map((q) => ({ ...q, answer: st?.answers[q.id] ?? q.answer }));
      stages.push(snap);
    }
    const matrix = buildMatrix({ brd: documents.brd, fdd: documents.fdd, dsd: documents.dsd, tdd: documents.tdd, sit: documents['sit-strategy'], uat: documents['uat-strategy'] }, this.removedIds());
    const exportFiles: string[] = [];
    for (const rel of [...this.order.map((k) => this.deliverablePath(k)), `${DELIVERABLES}/rtm.xlsx`, ...RTM_FILES]) {
      try {
        await fs.access(path.join(this.project.dir, rel));
        exportFiles.push(rel);
      } catch {
        /* not exported yet */
      }
    }
    return {
      project: { id: this.project.id, name: this.project.name, type: this.project.type, dir: this.project.dir, templatePack: this.project.templatePack },
      provider: this.opts.provider?.name ?? 'No AI connected',
      stages,
      documents,
      inputs: await listInputs(this.project.dir),
      audit: await readAudit(this.project.dir, 100),
      coverage: coverageOf(matrix),
      exportReady: this.order.every((k) => this.status(k) === 'approved'),
      exportFiles,
      busy: this.busy,
    };
  }

  // ---------------------------------------------------------------- internals

  private async exclusive<T>(fn: () => Promise<T>): Promise<T> {
    if (this.busy) throw new PipelineError('Another step is still running. Wait for it to finish.');
    this.busy = true;
    try {
      return await fn();
    } finally {
      this.busy = false;
    }
  }

  private priorApproved(key: StageKey): boolean {
    return this.order.slice(0, this.order.indexOf(key)).every((p) => this.state.stages[p]?.status === 'approved');
  }

  private stage(key: StageKey): StageState {
    return (this.state.stages[key] ??= emptyStage());
  }

  private now(): string {
    return (this.opts.clock?.() ?? new Date()).toISOString();
  }

  private emit(event: PipelineEvent): void {
    this.opts.onEvent?.(event);
  }

  private progress(stage: StageKey, message: string): void {
    this.emit({ type: 'progress', stage, message });
  }

  private requireProvider(): LlmProvider {
    if (!this.opts.provider) throw new PipelineError('No AI is connected.', ['Sign in to GitHub Copilot in VS Code and use SDLC CAPM, or run /sdlc-next in Copilot Chat.']);
    return this.opts.provider;
  }

  private removedIds(): string[] {
    const exact = new RegExp(`^${ID_PATTERN.source}$`);
    return Object.values(this.state.stages).flatMap((s) => Object.entries(s?.resolutions ?? {}).filter(([id, d]) => d === 'remove' && exact.test(id)).map(([id]) => id));
  }

  private async persist(): Promise<void> {
    await saveState(this.project.dir, this.state);
  }

  private async audit(stage: string, action: string, actor: string, version: string, detail: string): Promise<void> {
    await appendAudit(this.project.dir, { at: this.now(), stage, action, actor, version, detail });
  }

  private async writeBody(key: StageKey, body: string, status: 'draft' | 'approved', generatedBy?: string): Promise<void> {
    const def = STAGES[key];
    const st = this.stage(key);
    const file = this.documentPath(key);
    const previous = (await readDoc(file))?.meta ?? {};
    await writeDoc(file, {
      document: def.docTitle,
      project: this.project.name,
      version: st.version ?? FIRST_DRAFT,
      status,
      owner: this.project.owners[key],
      template: `${this.project.templatePack}/${def.file}`,
      generated_by: generatedBy ?? (previous.generated_by as string | undefined),
      approved_by: status === 'approved' ? st.approvedBy : undefined,
      approved_at: status === 'approved' ? st.approvedAt : undefined,
    }, body);
    st.bodyHash = hashBody(body);
  }

  private async syncEditsInner(key: StageKey, actor: Actor): Promise<boolean> {
    const doc = await readDoc(this.documentPath(key));
    const st = this.state.stages[key];
    if (!doc || !st?.bodyHash) return false;
    const hash = hashBody(doc.body);
    if (hash === st.bodyHash) return false;
    st.bodyHash = hash;
    st.history.push({ version: st.version ?? '', action: 'edited', by: actor.name, at: this.now() });
    await this.audit(key, 'edited', actor.name, st.version ?? '', 'Edited the document directly');
    await this.check(key);
    await this.persist();
    this.emit({ type: 'changed' });
    return true;
  }

  private async upstream(key: StageKey): Promise<UpstreamDoc[]> {
    const prior = new Set(this.order.slice(0, this.order.indexOf(key)));
    const out: UpstreamDoc[] = [];
    for (const k of STAGES[key].inputsFrom) {
      const st = this.state.stages[k];
      if (!prior.has(k) || st?.status !== 'approved') continue;
      const body = await this.readDocument(k);
      if (body) out.push({ key: k, title: STAGES[k].docTitle, version: st.version ?? '', body });
    }
    return out;
  }

  private async gather(key: StageKey): Promise<{ content: StageContent; upstream: UpstreamDoc[]; inputs: InputFile[]; notes: string[] }> {
    const def = STAGES[key];
    this.progress(key, 'Loading the template and the approved documents');
    const content = await loadStageContent(this.opts.toolRoot, this.project.templatePack, def);
    const upstream = await this.upstream(key);
    let inputs: InputFile[] = [];
    const notes: string[] = [];
    if (def.readsRawInputs || def.readsFigma) {
      this.progress(key, def.readsRawInputs ? 'Reading the input files' : 'Reading the Figma frames');
      const all = await readInputs(this.project.dir);
      inputs = def.readsRawInputs ? all : all.filter((f) => f.kind === 'figma');
      if (def.readsRawInputs && !all.some((f) => f.kind === 'document' && f.text?.trim())) {
        throw new PipelineError('There are no readable input files yet.', ['Add requirement notes, transcripts or documents to the inputs folder, then run again.']);
      }
      // Trim the largest files until the whole request fits. The first pass ignores the
      // headings added around each file, so measure again and tighten if needed.
      const max = this.maxTokens;
      const measure = () => messageTokens(buildMessages({ def, mode: 'draft', content, project: this.project, upstream, inputs, removed: this.removedIds() }));
      const base = messageTokens(buildMessages({ def, mode: 'draft', content, project: this.project, upstream, removed: this.removedIds() }));
      const cut = new Map<string, string>();
      let budget = Math.max(0, max - base);
      for (let pass = 0; pass < 4; pass++) {
        for (const n of fitInputs(inputs, budget)) cut.set(n.rel, n.message);
        const over = measure() - max;
        if (over <= 0) break;
        budget = Math.max(0, budget - over - 25);
      }
      notes.push(...cut.values());
      for (const f of inputs) if (!f.readable && f.note) notes.push(`${f.rel}: ${f.note}`);
    }
    return { content, upstream, inputs, notes };
  }

  private async inputsForChecks(): Promise<{ inputs: string[]; inputTexts: { rel: string; text: string }[] }> {
    const files = (await readInputs(this.project.dir)).filter((f) => f.readable);
    return {
      inputs: files.map((f) => f.rel),
      inputTexts: files.filter((f) => f.text !== undefined).map((f) => ({ rel: f.rel, text: f.text! })),
    };
  }

  private async check(key: StageKey): Promise<void> {
    const def = STAGES[key];
    const st = this.stage(key);
    const body = (await this.readDocument(key)) ?? '';
    const idx = this.order.indexOf(key);
    const before = (k: StageKey) => this.order.indexOf(k) >= 0 && this.order.indexOf(k) < idx;
    st.checks = runChecks({
      def,
      body,
      template: await loadTemplate(this.opts.toolRoot, this.project.templatePack, def),
      answers: st.answers,
      resolutions: st.resolutions,
      removed: this.removedIds(),
      docs: {
        brd: before('brd') ? await this.readDocument('brd') : undefined,
        fdd: before('fdd') ? await this.readDocument('fdd') : undefined,
        intake: key === 'brd' && before('intake') ? await this.readDocument('intake') : undefined,
      },
      checklist: key === 'brd' ? await loadChecklist(this.opts.toolRoot) : [],
      notes: st.notes,
      ...(key === 'intake' ? await this.inputsForChecks() : {}),
    });
  }
}
