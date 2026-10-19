import * as XLSX from 'xlsx';
import { cellFor, extractItems, type TraceItem } from '../trace/items';
import type { TraceDocs } from '../trace/matrix';
import { toCsv } from '../util/csv';
import { idsWithRanges } from '../util/ids';
import { cellText, normalizeHeading, parseSections, parseTables } from '../util/markdown';
import { formatWhen } from './word';

export interface JiraIssue {
  /** The Issue Id Jira links parents by: EP-01 for an epic, the FDD ID for a story, the TDD ID for a sub-task. */
  id: string;
  parent: string;
  type: 'Epic' | 'Story' | 'Sub-task';
  summary: string;
  description: string;
  acceptance: string;
  priority: string;
  labels: string[];
  /** The BRD requirements the issue delivers. */
  brd: string[];
}

export const JIRA_COLUMNS = ['Issue Id', 'Parent Id', 'Issue Type', 'Summary', 'Description', 'Acceptance Criteria', 'Priority', 'Labels', 'BRD IDs'];
const LABEL = 'sdlc-capm';

/** Plain text for Jira: no Markdown marks or table line breaks. */
const tidy = (s: string) => cellText(s).replace(/<br\s*\/?>/gi, '\n').replace(/\*\*|__|`/g, '').trim();
/** A summary line: no source references in brackets, at most 255 characters as Jira requires. */
function summary(s: string): string {
  const t = tidy(s).replace(/\s*\[[^\]]*\]/g, '').replace(/\s+/g, ' ').replace(/[.;:,\s]+$/, '').trim();
  return t.length > 255 ? `${t.slice(0, 254).trimEnd()}…` : t;
}

/** The first sentence: the full text stays in the description. */
const firstSentence = (s: string) => s.replace(/\s*\[[^\]]*\]/g, '').split(/(?<=[.;])\s+/)[0];

/** MoSCoW priorities from the BRD, in the names Jira uses by default. */
function jiraPriority(values: string[]): string {
  const rank = ['must', 'should', 'could', 'won'];
  const names = ['High', 'Medium', 'Low', 'Lowest'];
  const found = values.map((v) => rank.findIndex((r) => v.trim().toLowerCase().startsWith(r))).filter((i) => i >= 0);
  if (found.length) return names[Math.min(...found)];
  return values.find((v) => v.trim()) ?? '';
}

const live = (md: string | undefined, prefix: string) => (md ? extractItems(md).filter((i) => i.prefix === prefix && !i.struck) : []);
const refsOf = (item: TraceItem, prefix: string) => idsWithRanges((item.cells ?? []).slice(1).join(' ')).filter((id) => id.startsWith(`${prefix}-`));

/** The rows of the BRD's "Functional changes" table: each becomes an epic. */
function functionalChanges(brd: string): { name: string; system: string; frs: string[] }[] {
  const section = parseSections(brd).find((s) => s.level === 2 && normalizeHeading(s.title) === 'functional changes');
  const table = section && parseTables(section.body)[0];
  if (!table) return [];
  const col = (re: RegExp) => table.headers.findIndex((h) => re.test(cellText(h)));
  const [change, system] = [col(/change/i), col(/system/i)];
  return table.rows
    .map((r) => ({ name: summary(r[change >= 0 ? change : 0] ?? ''), system: tidy(system >= 0 ? (r[system] ?? '') : ''), frs: idsWithRanges(r.join(' ')).filter((id) => id.startsWith('FR-')) }))
    .filter((c) => c.name && c.frs.length);
}

/**
 * Jira epics, stories and sub-tasks from the approved deliverables: an epic per functional change in the BRD,
 * a story per FDD item and a sub-task per TDD item, each carrying the BRD requirements it delivers.
 */
export function buildJiraIssues(docs: Pick<TraceDocs, 'brd' | 'fdd' | 'tdd'>, removed: string[]): JiraIssue[] {
  if (!docs.brd || !docs.fdd) return [];
  const frs = new Map(live(docs.brd, 'FR').filter((f) => !removed.includes(f.id)).map((f) => [f.id, { text: tidy(cellFor(f, /requirement/i)), priority: cellFor(f, /priority/i) }]));
  const changes = functionalChanges(docs.brd);

  const stories = live(docs.fdd, 'FD')
    .map((fd) => ({ fd, frs: refsOf(fd, 'FR').filter((id) => frs.has(id)) }))
    .filter((s) => s.frs.length);
  const epicOf = (s: { frs: string[] }) => changes.findIndex((c) => s.frs.some((fr) => c.frs.includes(fr)));

  const epics: JiraIssue[] = [];
  const epicId = new Map<number, string>();
  const ensureEpic = (index: number) => {
    if (epicId.has(index)) return epicId.get(index)!;
    const id = `EP-${String(epics.length + 1).padStart(2, '0')}`;
    const c = changes[index];
    epics.push({
      id,
      parent: '',
      type: 'Epic',
      summary: c ? c.name : 'Other requirements',
      description: c ? [`Functional change from the BRD.`, c.system && `System: ${c.system}`, `BRD requirements: ${c.frs.join(', ')}`].filter(Boolean).join('\n') : 'BRD requirements that no functional change in the BRD lists.',
      acceptance: '',
      priority: '',
      labels: [LABEL],
      brd: [],
    });
    epicId.set(index, id);
    return id;
  };

  const issues: JiraIssue[] = [];
  const storyIds = new Set<string>();
  const storyIssues: JiraIssue[] = [];
  for (const s of stories) {
    const parent = ensureEpic(epicOf(s));
    const field = (re: RegExp, label: string) => {
      const v = tidy(cellFor(s.fd, re));
      return v ? `${label}: ${v}` : '';
    };
    const change = tidy(cellFor(s.fd, /functional change|change/i));
    const acceptance = s.frs.map((fr) => `${fr}: ${frs.get(fr)!.text}`).join('\n');
    storyIssues.push({
      id: s.fd.id,
      parent,
      type: 'Story',
      summary: summary(change) || s.fd.id,
      description: `${[change, field(/^systems?$/i, 'Systems'), field(/^tables?$/i, 'Tables'), field(/number of columns/i, 'Number of columns'), field(/screens|interfaces/i, 'Screens and interfaces')].filter(Boolean).join('\n')}\n\nAcceptance criteria (the BRD requirements):\n${acceptance}`,
      acceptance,
      priority: jiraPriority(s.frs.map((fr) => frs.get(fr)!.priority)),
      labels: [LABEL, ...s.frs],
      brd: s.frs,
    });
    storyIds.add(s.fd.id);
  }

  const subTasks = new Map<string, JiraIssue[]>();
  for (const td of live(docs.tdd, 'TD')) {
    const fds = refsOf(td, 'FD').filter((id) => storyIds.has(id));
    if (!fds.length) continue;
    const parent = storyIssues.find((st) => st.id === fds[0])!;
    const component = tidy(cellFor(td, /component/i));
    const design = tidy(cellFor(td, /design/i));
    const data = tidy(cellFor(td, /^data$/i));
    const list = subTasks.get(parent.id) ?? [];
    list.push({
      id: td.id,
      parent: parent.id,
      type: 'Sub-task',
      summary: summary(component && design ? `${component}: ${firstSentence(design)}` : component || firstSentence(design)) || td.id,
      description: [design, data && `Data: ${data}`, fds.length > 1 && `Also builds: ${fds.slice(1).join(', ')}`].filter(Boolean).join('\n'),
      acceptance: '',
      priority: parent.priority,
      labels: [LABEL],
      brd: [...new Set(fds.flatMap((fd) => storyIssues.find((st) => st.id === fd)!.brd))],
    });
    subTasks.set(parent.id, list);
  }

  // Each epic, then its stories, each followed by its sub-tasks: parents always come before their children.
  for (const epic of epics) {
    issues.push(epic);
    for (const st of storyIssues.filter((x) => x.parent === epic.id)) issues.push(st, ...(subTasks.get(st.id) ?? []));
    epic.brd = [...new Set(storyIssues.filter((x) => x.parent === epic.id).flatMap((x) => x.brd))];
  }
  return issues;
}

const row = (i: JiraIssue) => [i.id, i.parent, i.type, i.summary, i.description, i.acceptance, i.priority, i.labels.join(' '), i.brd.join(', ')];

/** The file Jira's CSV import reads (System > External system import > CSV). */
export function jiraToCsv(issues: JiraIssue[]): string {
  return toCsv([JIRA_COLUMNS, ...issues.map(row)]);
}

/** The same issues as a workbook to review before importing, with the import steps and document control. */
export function jiraToExcel(issues: JiraIssue[], project: string, generatedAt: string): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([JIRA_COLUMNS, ...issues.map(row)]);
  ws['!cols'] = [10, 10, 10, 60, 70, 50, 10, 24, 18].map((wch) => ({ wch }));
  if (issues.length) ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: issues.length, c: JIRA_COLUMNS.length - 1 } }) };
  XLSX.utils.book_append_sheet(wb, ws, 'Jira import');

  const count = (t: JiraIssue['type']) => issues.filter((i) => i.type === t).length;
  const steps = XLSX.utils.aoa_to_sheet([
    ['Step', 'What to do'],
    [1, 'In Jira, open System > External system import > CSV, and choose jira-import.csv from the same folder. This workbook is the same list, for review.'],
    [2, 'Pick the Jira project the issues go into.'],
    [3, 'Map the columns: Issue Id, Parent Id, Issue Type, Summary, Description, Priority and Labels. Issue Id and Parent Id link each story to its epic and each sub-task to its story.'],
    [4, 'Map Acceptance Criteria to your acceptance criteria field, or leave it out: it is already at the end of each story description.'],
    [5, 'If your project names its issue types or priorities differently, change them in the CSV before importing.'],
  ]);
  steps['!cols'] = [{ wch: 6 }, { wch: 110 }];
  XLSX.utils.book_append_sheet(wb, steps, 'How to import');

  const control = XLSX.utils.aoa_to_sheet([
    ['Field', 'Value'],
    ['Document', 'Jira import: epics, stories and sub-tasks'],
    ['Project', project],
    ['Generated', formatWhen(generatedAt)],
    ['Built from', 'The approved BRD (epics from its functional changes), FDD (one story per item) and TDD (one sub-task per item)'],
    ['Issues', `${count('Epic')} epics, ${count('Story')} stories, ${count('Sub-task')} sub-tasks`],
  ]);
  control['!cols'] = [{ wch: 18 }, { wch: 100 }];
  XLSX.utils.book_append_sheet(wb, control, 'Document control');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
