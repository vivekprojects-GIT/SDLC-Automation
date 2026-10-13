import { messageTokens } from '../context/budget';
import { buildMessages, type EpicPlan, type Piece, type PromptInput, type UpstreamDoc } from '../context/prompt';
import { PipelineError } from '../errors';
import { parseStories } from '../export/jira';
import type { LlmMessage, LlmProvider } from '../llm/provider';
import type { StageKey } from '../stages/registry';
import { cellFor, extractItems, requirementIds } from '../trace/items';
import { buildMatrix } from '../trace/matrix';
import { idsIn, maxNumber, padId, prefixOf } from '../util/ids';
import { cleanOutput, filterTableRows, firstCell, normalizeHeading, parseSections, parseTables, toLf } from '../util/markdown';

/**
 * How a document gets written: in one request when it fits, otherwise in natural pieces
 * (test cases per group of scenarios, stories one group of epics at a time after an epic plan).
 * Afterwards every requirement it should cover is checked, and the missing ones are written
 * automatically, so a reply that was cut short does not reach the reviewer with gaps.
 */

export interface WriteContext {
  key: StageKey;
  base: PromptInput;
  provider: LlmProvider;
  /** The most one request may send. */
  maxTokens: number;
  /** How long one reply can safely be. Longer documents are written in pieces. */
  maxOutputTokens: number;
  /** Optional: units per piece, overriding the size worked out from maxOutputTokens. */
  chunkSize?: number;
  progress: (message: string) => void;
}

export interface WriteResult {
  body: string;
  /** How many writing requests the document took (1 when written whole). */
  pieces: number;
  /** Requirements whose missing items were written automatically after the first pass. */
  filled: string[];
}

/** Rough reply length per unit: one scenario's test cases, one requirement's stories. */
const TOKENS_PER_UNIT = { 'test-cases': 450, stories: 350 } as const;
const GAP_ROUNDS = 2;

type Kind = { prefix: 'TS' | 'TC' | 'US'; column: 'scenarios' | 'testCases' | 'stories'; plural: string };
const COVERAGE: Partial<Record<StageKey, Kind>> = {
  'test-scenarios': { prefix: 'TS', column: 'scenarios', plural: 'scenarios' },
  'test-cases': { prefix: 'TC', column: 'testCases', plural: 'test cases' },
  stories: { prefix: 'US', column: 'stories', plural: 'stories' },
};

export async function writeDocument(c: WriteContext): Promise<WriteResult> {
  const def = c.base.def;
  const whole = buildMessages(c.base);
  const split = !!def.chunkPrefix && (messageTokens(whole) > c.maxTokens || expectedReply(c) > c.maxOutputTokens);
  let body: string;
  let pieces = 1;
  if (split) {
    ({ body, pieces } = def.key === 'stories' ? await storiesByEpic(c) : await testCasesByScenario(c));
  } else {
    assertFits(c, whole, `The ${def.title} step`);
    body = await ask(c, whole);
  }
  const gaps = await fillGaps(c, body);
  return { body: pieces > 1 || gaps.filled.length ? withSummary(def.key, gaps.body) : gaps.body, pieces, filled: gaps.filled };
}

/** A revision is one request; afterwards the same gap check and fill runs. */
export async function reviseDocument(c: WriteContext, messages: LlmMessage[]): Promise<{ body: string; filled: string[] }> {
  assertFits(c, messages, `Revising the ${c.base.def.docTitle}`, 'Edit the document directly instead, or pick a model with a larger context.');
  const gaps = await fillGaps(c, await ask(c, messages));
  return { body: gaps.filled.length ? withSummary(c.base.def.key, gaps.body) : gaps.body, filled: gaps.filled };
}

// ---------------------------------------------------------------- pieces

async function testCasesByScenario(c: WriteContext): Promise<{ body: string; pieces: number }> {
  const removed = c.base.removed;
  const scenarios = extractItems(upstreamBody(c, 'test-scenarios') ?? '').filter((i) => i.prefix === 'TS' && !i.struck);
  const units = scenarios.length
    ? scenarios.map((s) => ({ ts: [s.id], frs: s.refs.filter((r) => r.startsWith('FR-') && !removed.includes(r)) }))
    : requirementIds(upstreamBody(c, 'brd'), removed).map((fr) => ({ ts: [] as string[], frs: [fr] }));
  const size = c.chunkSize ?? Math.max(1, Math.floor(c.maxOutputTokens / TOKENS_PER_UNIT['test-cases']));
  const queue = groups(units, size);
  const outputs: string[] = [];
  let startAt = 1;
  while (queue.length) {
    const group = queue.shift()!;
    const ts = group.flatMap((u) => u.ts);
    const frs = unique(group.flatMap((u) => u.frs));
    const piece: Piece = ts.length ? { kind: 'scenarios', ids: frs, scenarios: ts, startAt } : { kind: 'requirements', ids: frs, startAt, epicStartAt: 1 };
    const messages = buildMessages({ ...c.base, upstream: onlyThese(c.base.upstream, frs, ts.length ? ts : undefined), piece });
    if (messageTokens(messages) > c.maxTokens && group.length > 1) {
      queue.unshift(...halves(group));
      continue;
    }
    assertFits(c, messages, `One part of the ${c.base.def.title} step`);
    c.progress(`Writing test cases for ${span(ts.length ? ts : frs)}`);
    const out = await ask(c, messages);
    outputs.push(out);
    startAt = Math.max(startAt, maxNumber(idsIn(out), 'TC') + 1);
  }
  return { body: mergeParts(outputs, 'TC'), pieces: outputs.length };
}

async function storiesByEpic(c: WriteContext): Promise<{ body: string; pieces: number }> {
  const reqs = requirementIds(upstreamBody(c, 'brd'), c.base.removed);
  const perEpicBudget = c.chunkSize ? c.chunkSize * TOKENS_PER_UNIT.stories : c.maxOutputTokens;

  // First a short plan: which epics, and which requirements each covers.
  let epics: EpicPlan[] = [];
  const plan = buildMessages({ ...c.base, piece: { kind: 'epic-plan', ids: reqs } });
  if (messageTokens(plan) <= c.maxTokens) {
    c.progress('Planning the epics');
    epics = parseEpicPlan(cleanOutput(await c.provider.complete(plan)), reqs);
  }
  if (!epics.length) {
    const size = Math.max(1, Math.floor(perEpicBudget / TOKENS_PER_UNIT.stories));
    epics = groups(reqs, size).map((covers, i) => ({ id: padId('EP', i + 1), name: '', covers }));
  }

  // Then the stories, a few epics at a time.
  const queue: EpicPlan[][] = [];
  let current: EpicPlan[] = [];
  let load = 0;
  for (const e of epics) {
    const cost = e.covers.length * TOKENS_PER_UNIT.stories;
    if (current.length && load + cost > perEpicBudget) {
      queue.push(current);
      current = [];
      load = 0;
    }
    current.push(e);
    load += cost;
  }
  if (current.length) queue.push(current);

  const outputs: string[] = [];
  let startAt = 1;
  while (queue.length) {
    const group = queue.shift()!;
    const frs = unique(group.flatMap((e) => e.covers));
    const messages = buildMessages({ ...c.base, upstream: onlyThese(c.base.upstream, frs), piece: { kind: 'epics', ids: frs, epics: group, startAt } });
    if (messageTokens(messages) > c.maxTokens && group.length > 1) {
      queue.unshift(...halves(group));
      continue;
    }
    assertFits(c, messages, `One part of the ${c.base.def.title} step`);
    c.progress(`Writing stories for ${group.map((e) => e.id).join(', ')}`);
    const out = await ask(c, messages);
    outputs.push(out);
    startAt = Math.max(startAt, maxNumber(idsIn(out), 'US') + 1);
  }
  return { body: mergeParts(outputs, 'US'), pieces: outputs.length };
}

/** Reads "## EP-01 Name" + "Covers: FR-.." pairs. Each requirement goes to its first epic; any left over get an epic of their own. */
export function parseEpicPlan(text: string, reqs: string[]): EpicPlan[] {
  const seen = new Set<string>();
  const epics: EpicPlan[] = [];
  for (const s of parseSections(text)) {
    const m = s.level === 2 && s.title.replace(/[*_`]/g, '').match(/^(EP-\d+)\s*[:.-]?\s*(.*)$/);
    if (!m) continue;
    const covers = idsIn(s.body.match(/^\s*\**covers:?\**:?\s*(.+)$/im)?.[1] ?? s.body).filter((id) => reqs.includes(id) && !seen.has(id));
    covers.forEach((id) => seen.add(id));
    if (covers.length) epics.push({ id: m[1], name: m[2].trim(), covers });
  }
  const left = reqs.filter((r) => !seen.has(r));
  if (epics.length && left.length) epics.push({ id: padId('EP', maxNumber(epics.map((e) => e.id), 'EP') + 1), name: 'Other requirements', covers: left });
  return epics;
}

// ---------------------------------------------------------------- gaps

async function fillGaps(c: WriteContext, body: string): Promise<{ body: string; filled: string[] }> {
  const kind = COVERAGE[c.key];
  if (!kind) return { body, filled: [] };
  const filled: string[] = [];
  for (let round = 0; round < GAP_ROUNDS; round++) {
    const missing = missingCoverage(c, body, kind);
    if (!missing.length) break;
    const ids = idsIn(body);
    const scenarios = c.key === 'test-cases' ? scenariosFor(c, missing) : undefined;
    const messages = buildMessages({
      ...c.base,
      mode: 'draft',
      current: undefined,
      comment: undefined,
      upstream: onlyThese(c.base.upstream, missing, scenarios?.length ? scenarios : undefined),
      piece: { kind: 'gaps', ids: missing, startAt: maxNumber(ids, kind.prefix) + 1, epicStartAt: maxNumber(ids, 'EP') + 1 },
    });
    if (messageTokens(messages) > c.maxTokens) break; // leave it to the coverage check and the reviewer
    c.progress(`Writing the missing ${kind.plural} for ${missing.join(', ')}`);
    body = mergeParts([body, await ask(c, messages)], kind.prefix);
    const still = missingCoverage(c, body, kind);
    filled.push(...missing.filter((m) => !still.includes(m)));
  }
  return { body, filled };
}

function missingCoverage(c: WriteContext, body: string, kind: Kind): string[] {
  const brd = upstreamBody(c, 'brd');
  if (!brd) return [];
  const docs = { brd, scenarios: c.key === 'test-cases' ? upstreamBody(c, 'test-scenarios') : undefined, [kind.column]: body };
  return buildMatrix(docs, c.base.removed)
    .filter((r) => !r.removed && r[kind.column].length === 0)
    .map((r) => r.id);
}

function scenariosFor(c: WriteContext, frs: string[]): string[] {
  return extractItems(upstreamBody(c, 'test-scenarios') ?? '')
    .filter((i) => i.prefix === 'TS' && i.refs.some((r) => frs.includes(r)))
    .map((i) => i.id);
}

// ---------------------------------------------------------------- replies

async function ask(c: WriteContext, messages: LlmMessage[]): Promise<string> {
  return repairCutOff(cleanOutput(await c.provider.complete(messages)), COVERAGE[c.key]?.prefix);
}

function assertFits(c: WriteContext, messages: LlmMessage[], what: string, fix = 'Pick a model with a larger context, or set a higher budget.maxInputTokens in project.yaml.'): void {
  const tokens = messageTokens(messages);
  if (tokens > c.maxTokens) throw new PipelineError(`${what} needs about ${tokens.toLocaleString('en')} tokens of input, more than the ${c.maxTokens.toLocaleString('en')} allowed.`, [fix]);
}

function expectedReply(c: WriteContext): number {
  if (c.key === 'test-cases') {
    const n = extractItems(upstreamBody(c, 'test-scenarios') ?? '').filter((i) => i.prefix === 'TS').length || requirementIds(upstreamBody(c, 'brd'), c.base.removed).length;
    return n * TOKENS_PER_UNIT['test-cases'];
  }
  if (c.key === 'stories') return requirementIds(upstreamBody(c, 'brd'), c.base.removed).length * TOKENS_PER_UNIT.stories;
  return 0;
}

/**
 * Drops what a reply that stopped early leaves behind: a last table row that never closed,
 * and a last story that never reached its sub-tasks. The gap fill then writes those items again.
 */
export function repairCutOff(body: string, prefix?: 'TS' | 'TC' | 'US'): string {
  if (!prefix) return body;
  let lines = toLf(body).trimEnd().split('\n');
  if (prefix === 'US') {
    const last = parseSections(lines.join('\n')).filter((s) => s.level === 3 && /^US-\d+/.test(s.title.replace(/[*_`]/g, ''))).at(-1);
    if (last && last.end >= lines.length && !/sub-?tasks/i.test(last.body)) lines = lines.slice(0, last.start);
  } else {
    const end = lines.at(-1)?.trim() ?? '';
    if (end.startsWith('|') && !end.endsWith('|')) lines.pop();
    const table = parseTables(lines.join('\n')).at(-1);
    if (table && table.end >= lines.length && table.rows.length) {
      const lastRow = table.rows.at(-1)!;
      if (lastRow.filter((cell) => cell.trim()).length < Math.ceil(table.headers.length / 2)) lines.splice(table.rowLines.at(-1)!, 1);
    }
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

/** Joins pieces: table rows go into the first piece's table; epics go after the first piece's epics. */
export function mergeParts(parts: string[], prefix: 'TS' | 'TC' | 'US'): string {
  if (parts.length === 1) return parts[0];
  const base = toLf(parts[0]).trimEnd().split('\n');
  if (prefix === 'US') {
    const epics = parts.slice(1).flatMap((p) => {
      const lines = toLf(p).split('\n');
      return parseSections(p)
        .filter((s) => s.level === 2 && /^EP-\d+/.test(s.title.replace(/[*_`]/g, '')))
        .map((s) => lines.slice(s.start, s.end).join('\n').trimEnd());
    });
    return `${base.join('\n')}\n\n${epics.join('\n\n')}\n`;
  }
  const rows = parts.slice(1).flatMap((p) => {
    const lines = toLf(p).split('\n');
    return parseTables(p).flatMap((t) => t.rows.map((r, k) => ({ r, line: lines[t.rowLines[k]] }))).filter(({ r }) => prefixOf(firstCell(r)) === prefix).map(({ line }) => line);
  });
  const table = parseTables(base.join('\n')).find((t) => t.rows.some((r) => prefixOf(firstCell(r)) === prefix));
  base.splice(table ? table.end : base.length, 0, ...rows);
  return `${base.join('\n')}\n`;
}

/** After pieces are joined, the summary line is rewritten from the actual items, so its counts are right. */
export function withSummary(key: StageKey, body: string): string {
  let text: string | undefined;
  if (key === 'test-cases') {
    const types = extractItems(body).filter((i) => i.prefix === 'TC').map((i) => cellFor(i, /^type$/i).toLowerCase());
    const n = (t: string) => types.filter((x) => x.includes(t)).length;
    text = `${types.length} test cases: ${n('positive')} positive, ${n('negative')} negative, ${n('edge')} edge.`;
  } else if (key === 'stories') {
    const epics = parseStories(body);
    const stories = epics.flatMap((e) => e.stories);
    const points = stories.reduce((sum, s) => sum + (s.points ?? 0), 0);
    text = `${epics.length} epics, ${stories.length} stories, ${points} story points.`;
  }
  if (!text) return body;
  const lines = toLf(body).split('\n');
  const summary = parseSections(body).find((s) => s.level === 2 && normalizeHeading(s.title) === 'summary');
  if (!summary) return body;
  lines.splice(summary.start + 1, summary.end - summary.start - 1, text, '');
  return lines.join('\n');
}

// ---------------------------------------------------------------- helpers

function upstreamBody(c: WriteContext, key: StageKey): string | undefined {
  return c.base.upstream.find((u) => u.key === key)?.body;
}

/**
 * What one piece needs and nothing more: the BRD's rows for the requirements it covers and the
 * matching scenario rows. The rest of the BRD and the intake summary stay out, so a piece is
 * genuinely smaller than the whole request.
 */
function onlyThese(upstream: UpstreamDoc[], frs: string[], scenarios?: string[]): UpstreamDoc[] {
  const keepRow = (row: string[]) => {
    const id = firstCell(row);
    if (id.startsWith('FR-')) return frs.includes(id);
    if (id.startsWith('TS-')) return scenarios ? scenarios.includes(id) : idsIn(row.slice(1).join(' ')).some((r) => frs.includes(r));
    return false;
  };
  return upstream
    .filter((u) => u.key === 'brd' || u.key === 'test-scenarios')
    .map((u) => ({ ...u, title: `${u.title} (only the rows this part needs)`, body: rowsOnly(u.body, keepRow) }));
}

/** The header and the kept rows of each table that has any, under the table's section heading. */
function rowsOnly(body: string, keep: (row: string[]) => boolean): string {
  const lines = toLf(body).split('\n');
  const sections = parseSections(body);
  const out: string[] = [];
  for (const t of parseTables(body)) {
    const rows = t.rows.map((r, k) => ({ r, line: lines[t.rowLines[k]] })).filter(({ r }) => keep(r));
    if (!rows.length) continue;
    const heading = sections.filter((s) => s.start < t.start).at(-1);
    if (heading) out.push(lines[heading.start]);
    out.push(lines[t.start], lines[t.start + 1], ...rows.map((x) => x.line), '');
  }
  return out.join('\n');
}

const unique = <T>(xs: T[]) => [...new Set(xs)];
const groups = <T>(xs: T[], size: number): T[][] => Array.from({ length: Math.ceil(xs.length / size) }, (_, i) => xs.slice(i * size, (i + 1) * size));
const halves = <T>(xs: T[]): T[][] => [xs.slice(0, Math.ceil(xs.length / 2)), xs.slice(Math.ceil(xs.length / 2))];
const span = (ids: string[]) => (ids.length > 1 ? `${ids[0]} to ${ids.at(-1)}` : ids[0]);
