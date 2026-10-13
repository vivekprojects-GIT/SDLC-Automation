import type { ChecklistItem } from '../content';
import type { StageDef } from '../stages/registry';
import { buildMatrix, type TraceDocs } from '../trace/matrix';
import { cellFor, extractItems } from '../trace/items';
import type { CheckResult, Resolution } from '../types';
import { normalizeHeading, parseSections, stripComments } from '../util/markdown';
import { inputsCited, intakeCompleteness, partsUsed } from './completeness';
import { parseQuestions } from './questions';

export interface CheckInput {
  def: StageDef;
  body: string;
  template: string;
  answers: Record<string, string>;
  resolutions: Record<string, Resolution>;
  removed: string[];
  /** Approved documents from earlier steps that the checks compare against. */
  docs: Pick<TraceDocs, 'brd' | 'scenarios'> & { intake?: string };
  checklist: ChecklistItem[];
  notes: string[];
  /** Readable input files, for the intake step's "every file is used" check. */
  inputs?: string[];
  /** The text of the input files, for the intake step's "every section and timestamp is used" check. */
  inputTexts?: { rel: string; text: string }[];
}

const pass = (id: string, message: string): CheckResult => ({ id, level: 'pass', message });
const block = (id: string, message: string, extra: Partial<CheckResult> = {}): CheckResult => ({ id, level: 'block', message, ...extra });
const warn = (id: string, message: string): CheckResult => ({ id, level: 'warn', message });

/** Every level-2 heading of the template (without placeholders) must be present and filled. */
export function templateSections(template: string, body: string): CheckResult[] {
  const required = parseSections(template).filter((s) => s.level === 2 && !/[<{]/.test(s.title)).map((s) => s.title);
  const have = parseSections(body).filter((s) => s.level === 2);
  const out: CheckResult[] = [];
  for (const title of required) {
    const n = normalizeHeading(title);
    const sec = have.find((h) => normalizeHeading(h.title) === n);
    if (!sec) out.push(block(`section:${n}`, `Missing section: ${title}`, { fix: `Add the missing "${title}" section from the template.` }));
    else if (!stripComments(sec.body).trim()) out.push(block(`section:${n}`, `Empty section: ${title}`, { fix: `Fill in the "${title}" section.` }));
  }
  return out.length ? out : [pass('sections', `All ${required.length} template sections are filled`)];
}

export function uniqueIds(body: string): CheckResult[] {
  const items = extractItems(body);
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i.id, (counts.get(i.id) ?? 0) + 1);
  const dupes = [...counts].filter(([, n]) => n > 1).map(([id]) => id);
  if (dupes.length) return [block('ids', `These IDs are used more than once: ${dupes.join(', ')}`, { fix: `Give each item a unique ID; ${dupes.join(', ')} are used more than once.` })];
  return items.length ? [pass('ids', `IDs are unique (${counts.size} items)`)] : [];
}

export function openQuestions(body: string, answers: Record<string, string>): CheckResult[] {
  const qs = parseQuestions(body);
  if (!qs.length) return [pass('questions', 'No open questions')];
  const out: CheckResult[] = [];
  for (const q of qs) {
    const answer = (answers[q.id] ?? q.answer).trim();
    if (answer) continue;
    const critical = /critical/i.test(q.severity);
    out.push(critical ? block(`question:${q.id}`, `${q.id} needs an answer: ${q.question}`) : warn(`question:${q.id}`, `${q.id} has no answer yet: ${q.question}`));
  }
  const answered = qs.length - out.length;
  return [...out, ...(out.some((c) => c.level === 'block') ? [] : [pass('questions', `Critical questions answered (${answered} of ${qs.length} answered)`)])];
}

const MISSING_SOURCE = /^(?:|none|n\/?a|-|—|–|unknown|tbd)$/i;

/** True when at least one cited source is real: an input file, an approved document, or an intake question the business answered.
    An ASSUMPTION marker, an assumptions section, or an unanswered intake question backs nothing on its own. */
function backed(src: string, answered: Set<string>): boolean {
  return src
    .split(/[;,]/)
    .map((p) => p.trim())
    .some((p) => {
      if (MISSING_SOURCE.test(p) || /assumption/i.test(p)) return false;
      const q = p.match(/^intake\s+(Q\d+)$/i);
      return q ? answered.has(q[1].toUpperCase()) : true;
    });
}

/** Rows that nothing real backs need a reviewer decision. */
export function sources(body: string, prefixes: string[], label: string, resolutions: Record<string, Resolution>, intake?: string): CheckResult[] {
  const items = extractItems(body).filter((i) => i.kind === 'row' && prefixes.includes(i.prefix) && !i.struck);
  if (!items.length) return [block('sources', `No ${label} rows found. Use IDs like ${prefixes[0]}-01.`)];
  if (!items[0].headers?.some((h) => /source/i.test(h))) return [block('sources', `The ${label} table has no Source column.`)];
  const answered = new Set(intake ? parseQuestions(intake).filter((q) => q.answer.trim()).map((q) => q.id.toUpperCase()) : []);
  const out: CheckResult[] = [];
  for (const i of items) {
    const src = cellFor(i, /source/i);
    if (backed(src, answered)) continue;
    const decision = resolutions[i.id];
    if (decision === 'keep') out.push(pass(`source:${i.id}`, `${i.id} kept: the reviewer confirmed it with the business`));
    else if (decision === 'remove') out.push(pass(`source:${i.id}`, `${i.id} removed by the reviewer`));
    else out.push(block(`source:${i.id}`, `${i.id} has no source in the inputs, so it may be invented. Keep it if the business confirms it, or remove it.`, { itemId: i.id, options: ['keep', 'remove'] }));
  }
  return out.length ? out : [pass('sources', `Every ${label} cites a source`)];
}

export function checklist(body: string, items: ChecklistItem[], resolutions: Record<string, Resolution>): CheckResult[] {
  if (!items.length) return [];
  const text = body.toLowerCase();
  const out: CheckResult[] = [];
  const covered: string[] = [];
  for (const item of items) {
    if (item.keywords.some((k) => text.includes(k))) {
      covered.push(item.name);
      continue;
    }
    const id = `checklist:${item.name}`;
    if (resolutions[id] === 'waive') out.push(pass(id, `${item.name}: waived by the reviewer`));
    else out.push(block(id, `Not covered: ${item.name}. Add a requirement for it, or waive it if it does not apply.`, { itemId: id, options: ['waive'], fix: `Add a non-functional requirement for ${item.name.toLowerCase()}, with its source, or ASSUMPTION if the inputs do not say.` }));
  }
  if (covered.length) out.unshift(pass('checklist', `Covered: ${covered.join(', ')}`));
  return out;
}

export function coverage(i: CheckInput, kind: 'scenarios' | 'testCases' | 'stories'): CheckResult[] {
  const label = { scenarios: 'scenario', testCases: 'test case', stories: 'story' }[kind];
  const prefix = { scenarios: 'TS', testCases: 'TC', stories: 'US' }[kind];
  if (!extractItems(i.body).some((x) => x.prefix === prefix)) return [block('coverage', `No ${label}s found. Use IDs like ${prefix}-01.`)];
  if (!i.docs.brd) return [warn('coverage', 'No approved BRD to check coverage against')];
  const rows = buildMatrix({ ...i.docs, [kind]: i.body }, i.removed).filter((r) => !r.removed);
  const missing = rows.filter((r) => r[kind].length === 0).map((r) => r.id);
  if (missing.length) {
    const plural = kind === 'stories' ? 'stories' : `${label}s`;
    return [block('coverage', `No ${label} covers: ${missing.join(', ')}`, { fix: `Add ${plural} for ${missing.join(', ')}. Keep the existing ones and their IDs, and number the new ones after the last ID.` })];
  }
  return [pass('coverage', `Every requirement has a ${label} (${rows.length} of ${rows.length})`)];
}

export function testTypes(body: string): CheckResult[] {
  const types = extractItems(body).filter((i) => i.prefix === 'TC').map((i) => cellFor(i, /^type$/i).toLowerCase());
  const missing = ['positive', 'negative', 'edge'].filter((t) => !types.some((x) => x.includes(t)));
  return missing.length ? [warn('types', `No ${missing.join(' or ')} test cases`)] : [pass('types', 'Positive, negative and edge cases are all present')];
}

export function storyShape(body: string): CheckResult[] {
  const stories = extractItems(body).filter((i) => i.prefix === 'US' && i.kind === 'section');
  const out: CheckResult[] = [];
  for (const s of stories) {
    const b = s.body ?? '';
    if (!/\bas an? .+,? i want/i.test(b)) out.push(block(`story:${s.id}`, `${s.id} has no "As a ..., I want ..., so that ..." sentence`, { fix: `Give ${s.id} a user story sentence: "As a ..., I want ..., so that ...".` }));
    if (!/acceptance criteria/i.test(b) || !/\bgiven\b[\s\S]*\bthen\b/i.test(b)) out.push(block(`story:${s.id}:ac`, `${s.id} needs acceptance criteria in Given/When/Then form`, { fix: `Add acceptance criteria to ${s.id} in Given/When/Then form.` }));
    if (!/^points:\s*\d+/im.test(b)) out.push(warn(`story:${s.id}:points`, `${s.id} has no story points`));
    const covers = b.replace(/\*\*/g, '').match(/^covers:\s*(.+)$/im)?.[1] ?? '';
    if (!/\bFR-\d+/.test(covers)) out.push({ ...warn(`story:${s.id}:covers`, `${s.id} covers no requirement. Link it to an FR, or check the story is needed.`), fix: `Link ${s.id} to the functional requirements it delivers in its Covers line, or remove it if no requirement needs it.` });
  }
  return out.length ? out : [pass('stories', `All ${stories.length} stories have a user story sentence and acceptance criteria`)];
}

/** Numbers that look like national IDs or card numbers should not reach the documents. */
export function sensitiveData(body: string): CheckResult[] {
  const hits = [...(body.match(/\b\d{3}-\d{2}-\d{4}\b/g) ?? []), ...(body.match(/\b\d{13,19}\b/g) ?? [])];
  return hits.length ? [warn('sensitive', `Possible sensitive numbers found (ending ${hits.map((h) => h.slice(-4)).join(', ')}). Check they are not real client data.`)] : [];
}

export function runChecks(i: CheckInput): CheckResult[] {
  const out: CheckResult[] = [...templateSections(i.template, i.body), ...uniqueIds(i.body)];
  switch (i.def.key) {
    case 'intake':
      out.push(...inputsCited(i.body, i.inputs ?? []), ...partsUsed(i.body, i.inputTexts ?? []), ...openQuestions(i.body, i.answers));
      break;
    case 'prd':
      out.push(...sources(i.body, ['F'], 'feature', i.resolutions, i.docs.intake));
      break;
    case 'brd':
      out.push(
        ...sources(i.body, ['FR', 'NFR'], 'requirement', i.resolutions, i.docs.intake),
        ...checklist(i.body, i.checklist, i.resolutions),
        ...intakeCompleteness(i.docs.intake, i.body, i.resolutions),
      );
      break;
    case 'test-scenarios':
      out.push(...coverage(i, 'scenarios'));
      break;
    case 'test-cases':
      out.push(...testTypes(i.body), ...coverage(i, 'testCases'));
      break;
    case 'stories':
      out.push(...storyShape(i.body), ...coverage(i, 'stories'));
      break;
  }
  out.push(...sensitiveData(i.body));
  for (const n of i.notes) out.push(warn(`note:${n}`, n));
  return out;
}
