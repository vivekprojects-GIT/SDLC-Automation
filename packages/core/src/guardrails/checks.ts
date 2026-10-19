import type { ChecklistItem } from '../content';
import type { StageDef } from '../stages/registry';
import { buildMatrix, scopeOf, uncovered, type TraceDocs } from '../trace/matrix';
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
  docs: Pick<TraceDocs, 'brd' | 'fdd'> & { intake?: string };
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

/** Every requirement in the BRD has at least one functional design item (MUFG's FDD is one-to-one with the BRD). */
export function designCoverage(i: CheckInput): CheckResult[] {
  if (!extractItems(i.body).some((x) => x.prefix === 'FD')) return [block('coverage', 'No functional design items found. Use IDs like FD-01.')];
  if (!i.docs.brd) return [warn('coverage', 'No approved BRD to check the FDD against')];
  const rows = buildMatrix({ brd: i.docs.brd, fdd: i.body }, i.removed).filter((r) => !r.removed);
  const missing = rows.filter((r) => !r.design.length).map((r) => r.id);
  if (missing.length) return [block('coverage', `No functional design item covers: ${missing.join(', ')}`, { fix: `Add functional design items for ${missing.join(', ')}. Keep the existing ones and their IDs, and number the new ones after the last ID.` })];
  return [pass('coverage', `Every requirement has a functional design item (${rows.length} of ${rows.length})`)];
}

/** Every item of one kind names at least one item it realises (FD → FR, DA → FR or FD, TD → FD). */
export function links(body: string, prefix: string, targets: string[], what: string): CheckResult[] {
  const items = extractItems(body).filter((i) => i.prefix === prefix && !i.struck);
  const loose = items.filter((d) => !d.refs.some((r) => targets.some((t) => r.startsWith(`${t}-`)))).map((d) => d.id);
  if (loose.length) return [block(`links:${prefix}`, `These items name no ${what}: ${loose.join(', ')}`, { fix: `Name the ${what} (${targets.map((t) => `${t}-…`).join(' or ')}) that ${loose.join(', ')} serve, or remove them if nothing needs them.` })];
  return items.length ? [pass(`links:${prefix}`, `All ${items.length} ${prefix} items name the ${what} they serve`)] : [];
}

/** Every impacted data attribute in the DRD tab has a source-to-destination mapping in the DSD tab. */
export function dataMappings(body: string): CheckResult[] {
  if (!extractItems(body).some((x) => x.prefix === 'DA')) return [block('mappings', 'No impacted data attributes found. Use IDs like DA-01 in the DRD tab.')];
  const unmapped = uncovered(body, 'DA', body, 'DS');
  if (unmapped.length) return [block('mappings', `These data attributes have no source-to-destination mapping: ${unmapped.join(', ')}`, { fix: `Add a mapping row (DS-…) for ${unmapped.join(', ')} in the Data sourcing tab, with its source, destination and any transformation logic.` })];
  const n = extractItems(body).filter((x) => x.prefix === 'DA').length;
  return [pass('mappings', `Every data attribute has a source-to-destination mapping (${n} of ${n})`)];
}

/** Every functional design item has a technical design item. */
export function technicalCoverage(i: CheckInput): CheckResult[] {
  if (!extractItems(i.body).some((x) => x.prefix === 'TD')) return [block('coverage', 'No technical design items found. Use IDs like TD-01.')];
  if (!i.docs.fdd) return [warn('coverage', 'No approved FDD to check the TDD against')];
  const missing = uncovered(i.docs.fdd, 'FD', i.body, 'TD', i.removed);
  if (missing.length) return [block('coverage', `No technical design item covers: ${missing.join(', ')}`, { fix: `Add technical design items for ${missing.join(', ')}. Keep the existing ones and their IDs, and number the new ones after the last ID.` })];
  const n = extractItems(i.docs.fdd).filter((x) => x.prefix === 'FD' && !x.struck).length;
  return [pass('coverage', `Every functional design item has a technical design item (${n} of ${n})`)];
}

/** A QA strategy decides, for every requirement in the BRD, whether it is in scope, so the RTM can show it. */
export function scopeDecisions(i: CheckInput, label: 'SIT' | 'UAT'): CheckResult[] {
  if (!i.docs.brd) return [];
  const decided = scopeOf(i.body);
  const reqs = buildMatrix({ brd: i.docs.brd }, i.removed).filter((r) => !r.removed).map((r) => r.id);
  const open = reqs.filter((id) => !decided.get(id));
  if (open.length) return [block('scope', `The ${label} scope does not decide: ${open.join(', ')}`, { fix: `In the Requirements in scope table, add a row for ${open.join(', ')} with Yes or No, and the reason when No.` })];
  const inScope = reqs.filter((id) => decided.get(id) === 'Yes').length;
  return [pass('scope', `${label} scope decided for every requirement: ${inScope} in, ${reqs.length - inScope} out`)];
}

/** Each BRD requirement carries a type, as MUFG's BRD does (functional, data, report, interface…). */
export function requirementTypes(body: string): CheckResult[] {
  const untyped = extractItems(body).filter((i) => i.prefix === 'FR' && !i.struck && !cellFor(i, /^type$/i)).map((i) => i.id);
  return untyped.length ? [warn('types', `These requirements have no type: ${untyped.join(', ')}`)] : [];
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
    case 'brd':
      out.push(
        ...sources(i.body, ['FR', 'NFR'], 'requirement', i.resolutions, i.docs.intake),
        ...requirementTypes(i.body),
        ...checklist(i.body, i.checklist, i.resolutions),
        ...intakeCompleteness(i.docs.intake, i.body, i.resolutions),
      );
      break;
    case 'fdd':
      out.push(...links(i.body, 'FD', ['FR'], 'BRD requirement'), ...designCoverage(i));
      break;
    case 'dsd':
      out.push(...links(i.body, 'DA', ['FR', 'FD'], 'requirement or design item'), ...dataMappings(i.body));
      break;
    case 'tdd':
      out.push(...links(i.body, 'TD', ['FD'], 'functional design item'), ...technicalCoverage(i));
      break;
    case 'sit-strategy':
      out.push(...scopeDecisions(i, 'SIT'));
      break;
    case 'uat-strategy':
      out.push(...scopeDecisions(i, 'UAT'));
      break;
  }
  out.push(...sensitiveData(i.body));
  for (const n of i.notes) out.push(warn(`note:${n}`, n));
  return out;
}
