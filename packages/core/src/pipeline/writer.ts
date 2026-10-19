import { messageTokens } from '../context/budget';
import { buildMessages, type PieceUnit, type PromptInput, type UpstreamDoc } from '../context/prompt';
import { PipelineError } from '../errors';
import type { LlmMessage, LlmProvider } from '../llm/provider';
import type { ItemPrefix, StageKey } from '../stages/registry';
import { extractItems, requirementIds } from '../trace/items';
import { buildMatrix, uncovered, type TraceDocs } from '../trace/matrix';
import { idsIn, maxNumber, prefixOf } from '../util/ids';
import { cleanOutput, firstCell, normalizeHeading, parseSections, parseTables, toLf } from '../util/markdown';

/**
 * How a document gets written: in one request when it fits, otherwise in pieces of a few
 * requirements (FDD) or functional design items (TDD) at a time. Afterwards every requirement
 * or design item it should cover is checked, and the missing ones are written automatically,
 * so a reply that was cut short does not reach the reviewer with gaps.
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
  /** Requirements or design items whose missing items were written automatically after the first pass. */
  filled: string[];
}

/** What each item-writing step covers, and roughly how long its reply is per unit. */
const PLANS: Partial<Record<StageKey, { unit: PieceUnit; tokensPerUnit: number }>> = {
  fdd: { unit: 'FR', tokensPerUnit: 300 },
  tdd: { unit: 'FD', tokensPerUnit: 350 },
};
const GAP_ROUNDS = 2;
const NAMES: Record<ItemPrefix, string> = { FD: 'functional design items', DA: 'data attributes', TD: 'technical design items' };

export async function writeDocument(c: WriteContext): Promise<WriteResult> {
  const def = c.base.def;
  const whole = buildMessages(c.base);
  const plan = PLANS[def.key];
  const split = !!plan && (messageTokens(whole) > c.maxTokens || units(c).length * plan.tokensPerUnit > c.maxOutputTokens);
  let body: string;
  let pieces = 1;
  if (split) {
    ({ body, pieces } = await byParts(c));
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

async function byParts(c: WriteContext): Promise<{ body: string; pieces: number }> {
  const plan = PLANS[c.key]!;
  const prefix = c.base.def.items!;
  const size = c.chunkSize ?? Math.max(1, Math.floor(c.maxOutputTokens / plan.tokensPerUnit));
  const queue = groups(units(c), size);
  const outputs: string[] = [];
  let startAt = 1;
  while (queue.length) {
    const group = queue.shift()!;
    const messages = buildMessages({ ...c.base, upstream: onlyThese(c, group, plan.unit), piece: { kind: 'part', unit: plan.unit, ids: group, startAt } });
    if (messageTokens(messages) > c.maxTokens && group.length > 1) {
      queue.unshift(...halves(group));
      continue;
    }
    assertFits(c, messages, `One part of the ${c.base.def.title} step`);
    c.progress(`Writing ${NAMES[prefix]} for ${span(group)}`);
    const out = await ask(c, messages);
    outputs.push(out);
    startAt = Math.max(startAt, maxNumber(idsIn(out), prefix) + 1);
  }
  return { body: mergeParts(outputs, prefix), pieces: outputs.length };
}

/** The requirements (or design items) a step must cover, in order. */
function units(c: WriteContext): string[] {
  const plan = PLANS[c.key];
  if (!plan) return [];
  if (plan.unit === 'FR') return requirementIds(upstreamBody(c, 'brd'), c.base.removed);
  return designIds(upstreamBody(c, 'fdd'), c.base.removed);
}

function designIds(fdd: string | undefined, removed: string[]): string[] {
  return [...new Set(extractItems(fdd ?? '').filter((i) => i.prefix === 'FD' && !i.struck && !removed.includes(i.id)).map((i) => i.id))];
}

// ---------------------------------------------------------------- gaps

async function fillGaps(c: WriteContext, body: string): Promise<{ body: string; filled: string[] }> {
  const plan = PLANS[c.key];
  const prefix = c.base.def.items;
  if (!plan || !prefix) return { body, filled: [] };
  const filled: string[] = [];
  for (let round = 0; round < GAP_ROUNDS; round++) {
    const missing = missingUnits(c, body);
    if (!missing.length) break;
    const messages = buildMessages({
      ...c.base,
      mode: 'draft',
      current: undefined,
      comment: undefined,
      upstream: onlyThese(c, missing, plan.unit),
      piece: { kind: 'gaps', unit: plan.unit, ids: missing, startAt: maxNumber(idsIn(body), prefix) + 1 },
    });
    if (messageTokens(messages) > c.maxTokens) break; // leave it to the coverage check and the reviewer
    c.progress(`Writing the missing ${NAMES[prefix]} for ${missing.join(', ')}`);
    body = mergeParts([body, await ask(c, messages)], prefix);
    const still = missingUnits(c, body);
    filled.push(...missing.filter((m) => !still.includes(m)));
  }
  return { body, filled };
}

/** The requirements (or design items) this draft does not cover yet. */
export function missingUnits(c: Pick<WriteContext, 'key' | 'base'>, body: string): string[] {
  const brd = upstreamBody(c, 'brd');
  const fdd = upstreamBody(c, 'fdd');
  const removed = c.base.removed;
  switch (c.key) {
    case 'fdd':
      return brd ? missingDesign({ brd, fdd: body }, removed) : [];
    case 'tdd':
      return fdd ? uncovered(fdd, 'FD', body, 'TD', removed) : [];
    default:
      return [];
  }
}

function missingDesign(docs: TraceDocs, removed: string[]): string[] {
  return buildMatrix(docs, removed)
    .filter((r) => !r.removed && r.design.length === 0)
    .map((r) => r.id);
}

// ---------------------------------------------------------------- replies

async function ask(c: WriteContext, messages: LlmMessage[]): Promise<string> {
  return repairCutOff(cleanOutput(await c.provider.complete(messages)), c.base.def.items);
}

function assertFits(c: WriteContext, messages: LlmMessage[], what: string, fix = 'Pick a model with a larger context, or set a higher budget.maxInputTokens in project.yaml.'): void {
  const tokens = messageTokens(messages);
  if (tokens > c.maxTokens) throw new PipelineError(`${what} needs about ${tokens.toLocaleString('en')} tokens of input, more than the ${c.maxTokens.toLocaleString('en')} allowed.`, [fix]);
}

/**
 * Drops what a reply that stopped early leaves behind: a last table row that never closed, or
 * one with fewer than half its cells filled. The gap fill then writes that item again.
 */
export function repairCutOff(body: string, prefix?: ItemPrefix): string {
  if (!prefix) return body;
  const lines = toLf(body).trimEnd().split('\n');
  const end = lines.at(-1)?.trim() ?? '';
  if (end.startsWith('|') && !end.endsWith('|')) lines.pop();
  const table = parseTables(lines.join('\n')).at(-1);
  if (table && table.end >= lines.length && table.rows.length) {
    const lastRow = table.rows.at(-1)!;
    if (lastRow.filter((cell) => cell.trim()).length < Math.ceil(table.headers.length / 2)) lines.splice(table.rowLines.at(-1)!, 1);
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

/** Joins pieces: the item rows of later pieces go into the first piece's item table. */
export function mergeParts(parts: string[], prefix: ItemPrefix): string {
  if (parts.length === 1) return parts[0];
  const base = toLf(parts[0]).trimEnd().split('\n');
  const rows = parts.slice(1).flatMap((p) => {
    const lines = toLf(p).split('\n');
    return parseTables(p)
      .flatMap((t) => t.rows.map((r, k) => ({ r, line: lines[t.rowLines[k]] })))
      .filter(({ r }) => prefixOf(firstCell(r)) === prefix)
      .map(({ line }) => line);
  });
  const table = parseTables(base.join('\n')).find((t) => t.rows.some((r) => prefixOf(firstCell(r)) === prefix));
  base.splice(table ? table.end : base.length, 0, ...rows);
  return `${base.join('\n')}\n`;
}

/** After pieces are joined, the summary line is rewritten from the actual items, so its counts are right. */
export function withSummary(key: StageKey, body: string): string {
  const items = extractItems(body);
  const count = (prefix: string, covered: string) => {
    const own = items.filter((i) => i.prefix === prefix);
    return [own.length, new Set(own.flatMap((i) => i.refs.filter((r) => r.startsWith(`${covered}-`)))).size];
  };
  let text: string | undefined;
  if (key === 'fdd') {
    const [n, m] = count('FD', 'FR');
    text = `${n} functional design items covering ${m} requirements.`;
  } else if (key === 'tdd') {
    const [n, m] = count('TD', 'FD');
    text = `${n} technical design items covering ${m} functional design items.`;
  } else {
    return body;
  }
  const lines = toLf(body).split('\n');
  const summary = parseSections(body).find((s) => s.level === 2 && normalizeHeading(s.title) === 'summary');
  if (!summary) return body;
  lines.splice(summary.start + 1, summary.end - summary.start - 1, text, '');
  return lines.join('\n');
}

// ---------------------------------------------------------------- helpers

function upstreamBody(c: Pick<WriteContext, 'base'>, key: StageKey): string | undefined {
  return c.base.upstream.find((u) => u.key === key)?.body;
}

/**
 * What one piece needs and nothing more: the BRD rows for the requirements it covers and the
 * matching functional design rows. The intake summary stays out; strategies are kept whole,
 * as they set the approach for every case.
 */
function onlyThese(c: WriteContext, ids: string[], unit: PieceUnit): UpstreamDoc[] {
  const design = extractItems(upstreamBody(c, 'fdd') ?? '').filter((i) => i.prefix === 'FD');
  const frs = unit === 'FR' ? ids : unique(design.filter((d) => ids.includes(d.id)).flatMap((d) => d.refs.filter((r) => r.startsWith('FR-'))));
  const fds = unit === 'FD' ? ids : design.filter((d) => d.refs.some((r) => frs.includes(r))).map((d) => d.id);
  const attributes = extractItems(upstreamBody(c, 'dsd') ?? '')
    .filter((i) => i.prefix === 'DA' && i.refs.some((r) => frs.includes(r) || fds.includes(r)))
    .map((i) => i.id);
  const keepRow = (row: string[]) => {
    const id = firstCell(row);
    if (id.startsWith('FR-')) return frs.includes(id);
    if (id.startsWith('FD-')) return fds.includes(id);
    if (id.startsWith('DA-')) return attributes.includes(id);
    if (id.startsWith('DS-')) return idsIn(row.slice(1).join(' ')).some((r) => attributes.includes(r));
    return false;
  };
  const trimmed = new Set<StageKey>(['brd', 'fdd', 'dsd']);
  return c.base.upstream
    .filter((u) => u.key !== 'intake')
    .map((u) => (trimmed.has(u.key) ? { ...u, title: `${u.title} (only the rows this part needs)`, body: rowsOnly(u.body, keepRow) } : u));
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
