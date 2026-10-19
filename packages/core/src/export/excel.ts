import { Lexer, type Token, type Tokens } from 'marked';
import * as XLSX from 'xlsx';
import { T2BAU_COLUMNS, traceStatus } from '../trace/matrix';
import type { Coverage, MatrixRow } from '../types';
import { controlRows, formatWhen, plain, type DeliverableMeta } from './word';

type Row = (string | number)[];

/** A sheet with sensible column widths, wrapped text and, when it starts with a table, a filter on its header. */
function sheet(rows: Row[], opts: { widths?: number[]; filter?: boolean } = {}): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(rows.length ? rows : [['']]);
  const cols = Math.max(1, ...rows.map((r) => r.length));
  ws['!cols'] = Array.from({ length: cols }, (_, c) => ({
    wch: opts.widths?.[c] ?? Math.min(60, Math.max(10, ...rows.slice(0, 200).map((r) => String(r[c] ?? '').split('\n').reduce((m, l) => Math.max(m, l.length), 0) + 2))),
  }));
  if (opts.filter && rows.length > 1) ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: (rows[0]?.length ?? 1) - 1 } }) };
  return ws;
}

const toBuffer = (wb: XLSX.WorkBook) => XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

/** Excel tab names: at most 31 characters, none of : \ / ? * [ ], and unique in the workbook. */
function tabName(title: string, taken: Set<string>): string {
  const base = title.replace(/[:\\/?*[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Sheet';
  let name = base;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base.slice(0, 31 - String(n).length - 1)} ${n}`;
  taken.add(name.toLowerCase());
  return name;
}

/** The rows a block of Markdown becomes on a sheet: tables keep their columns, other text one line per row. */
function blockRows(t: Token): { rows: Row[]; table: boolean } {
  switch (t.type) {
    case 'table': {
      const tt = t as Tokens.Table;
      return { rows: [tt.header.map((h) => plain(h.tokens)), ...tt.rows.map((r) => r.map((c) => plain(c.tokens).replace(/<br\s*\/?>/gi, '\n')))], table: true };
    }
    case 'heading':
      return { rows: [[plain((t as Tokens.Heading).tokens).toUpperCase()]], table: false };
    case 'paragraph':
      return { rows: [[plain((t as Tokens.Paragraph).tokens)]], table: false };
    case 'list':
      return {
        rows: (t as Tokens.List).items.flatMap((item, i) => {
          const marker = (t as Tokens.List).ordered ? `${i + 1}.` : '•';
          return item.tokens.flatMap((sub) => (sub.type === 'list' ? blockRows(sub).rows.map((r) => [`    ${r[0]}`]) : 'tokens' in sub && Array.isArray(sub.tokens) ? [[`${marker} ${plain(sub.tokens)}`]] : []));
        }),
        table: false,
      };
    case 'code':
      return { rows: (t as Tokens.Code).text.split('\n').map((l) => [l]), table: false };
    case 'blockquote':
      return { rows: (t as Tokens.Blockquote).tokens.flatMap((x) => blockRows(x).rows), table: false };
    default:
      return { rows: [], table: false };
  }
}

/**
 * A deliverable as an Excel workbook: a Document control tab first, then one tab per "##" section,
 * in the order of the template. This is how MUFG keeps its BRD, FDD and DSD.
 */
export function markdownToWorkbook(markdown: string, meta: DeliverableMeta): Buffer {
  const wb = XLSX.utils.book_new();
  const taken = new Set<string>();
  XLSX.utils.book_append_sheet(wb, sheet([['Field', 'Value'], ...controlRows(meta)], { widths: [18, 80] }), tabName('Document control', taken));

  const tokens = new Lexer().lex(markdown.replace(/<!--[\s\S]*?-->/g, ''));
  let title: string | undefined;
  let blocks: Token[] = [];
  const flush = () => {
    if (title === undefined) return;
    const parts = blocks.map(blockRows).filter((b) => b.rows.length);
    const rows: Row[] = [];
    parts.forEach((b, i) => {
      if (i > 0) rows.push([]);
      rows.push(...b.rows);
    });
    // A tab that is just one table gets a filter on its header row.
    XLSX.utils.book_append_sheet(wb, sheet(rows, { filter: parts.length === 1 && parts[0].table }), tabName(title, taken));
  };
  for (const t of tokens) {
    if (t.type === 'heading' && (t as Tokens.Heading).depth === 1) continue;
    if (t.type === 'heading' && (t as Tokens.Heading).depth === 2) {
      flush();
      title = plain((t as Tokens.Heading).tokens);
      blocks = [];
      continue;
    }
    if (title !== undefined) blocks.push(t);
  }
  flush();
  return toBuffer(wb);
}

/**
 * The Requirements Traceability Matrix with its Transition to BAU plan: one row per BRD requirement,
 * traced to the FDD, the data attributes, the TDD and the SIT and UAT scope. The T2BAU columns are left for the BAU owner.
 */
export function rtmToExcel(rows: MatrixRow[], coverage: Coverage, project: string, generatedAt: string): Buffer {
  const wb = XLSX.utils.book_new();
  const header = ['BRD ID', 'Requirement', 'Type', 'Source', 'Priority', 'FDD', 'Data attributes', 'TDD', 'In SIT scope', 'In UAT scope', 'Trace status', ...T2BAU_COLUMNS];
  const data: Row[] = rows.map((r) =>
    r.removed
      ? [r.id, 'Removed by the reviewer', '', '', '', '', '', '', '', '', traceStatus(r), ...T2BAU_COLUMNS.map(() => '')]
      : [r.id, r.requirement, r.type, r.source, r.priority, r.design.join(', '), r.data.join(', '), r.technical.join(', '), r.sit, r.uat, traceStatus(r), ...T2BAU_COLUMNS.map(() => '')],
  );
  XLSX.utils.book_append_sheet(wb, sheet([header, ...data], { widths: [10, 60, 14, 30, 10, 14, 18, 14, 12, 12, 12, 18, 30, 30, 12], filter: true }), 'RTM');

  const pct = (n: number) => (coverage.requirements ? `${Math.round((n / coverage.requirements) * 100)}%` : '');
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      [
        ['Measure', 'Count', 'Share'],
        ['Requirements in the BRD', coverage.requirements, ''],
        ['With a functional design item', coverage.withDesign, pct(coverage.withDesign)],
        ['With data attributes', coverage.withData, pct(coverage.withData)],
        ['With a technical design item', coverage.withTechnical, pct(coverage.withTechnical)],
        ['SIT scope decided', coverage.sitDecided, pct(coverage.sitDecided)],
        ['UAT scope decided', coverage.uatDecided, pct(coverage.uatDecided)],
        ['Fully traced', coverage.fullyTraced, pct(coverage.fullyTraced)],
      ],
      { widths: [34, 10, 10] },
    ),
    'Coverage',
  );
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      [
        ['Field', 'Value'],
        ['Document', 'Requirements Traceability Matrix with Transition to BAU plan'],
        ['Project', project],
        ['Generated', formatWhen(generatedAt)],
        ['Transition to BAU', 'The BAU owner completes the last four columns of the RTM tab before Assurance Gate 1.'],
      ],
      { widths: [18, 80] },
    ),
    'Document control',
  );
  return toBuffer(wb);
}
