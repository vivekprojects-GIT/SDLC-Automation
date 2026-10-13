/** A row's first cell without bold, code or strike-through marks. */
export const firstCell = (row: string[]) => (row[0] ?? '').replace(/[*_~`]/g, '').trim();

export interface MdTable {
  headers: string[];
  rows: string[][];
  /** Line index of each row in the source text. */
  rowLines: number[];
  start: number;
  end: number;
}

export interface MdSection {
  level: number;
  title: string;
  /** Line index of the heading. */
  start: number;
  /** Line index where the section ends (exclusive). */
  end: number;
  body: string;
}

export const toLf = (text: string) => text.replace(/\r\n?/g, '\n');

export function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && s[i + 1] === '|') {
      cur += '\\|';
      i++;
    } else if (c === '|') {
      cells.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  cells.push(cur.trim());
  return cells;
}

const SEPARATOR = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

function fenceMask(lines: string[]): boolean[] {
  let inFence = false;
  return lines.map((l) => {
    if (/^\s*(```|~~~)/.test(l)) {
      inFence = !inFence;
      return true;
    }
    return inFence;
  });
}

export function parseTables(md: string): MdTable[] {
  const lines = toLf(md).split('\n');
  const fenced = fenceMask(lines);
  const tables: MdTable[] = [];
  for (let i = 0; i + 1 < lines.length; i++) {
    const isHeader = !fenced[i] && lines[i].trim().startsWith('|');
    const sep = lines[i + 1];
    if (!isHeader || !sep.includes('|') || !SEPARATOR.test(sep)) continue;
    const headers = splitRow(lines[i]);
    const rows: string[][] = [];
    const rowLines: number[] = [];
    let j = i + 2;
    while (j < lines.length && lines[j].trim().startsWith('|')) {
      rows.push(splitRow(lines[j]));
      rowLines.push(j);
      j++;
    }
    tables.push({ headers, rows, rowLines, start: i, end: j });
    i = j - 1;
  }
  return tables;
}

export function parseSections(md: string): MdSection[] {
  const lines = toLf(md).split('\n');
  const fenced = fenceMask(lines);
  const heads: { level: number; title: string; line: number }[] = [];
  lines.forEach((l, i) => {
    if (fenced[i]) return;
    const m = l.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (m) heads.push({ level: m[1].length, title: m[2].trim(), line: i });
  });
  return heads.map((h, k) => {
    let end = lines.length;
    for (let j = k + 1; j < heads.length; j++) {
      if (heads[j].level <= h.level) {
        end = heads[j].line;
        break;
      }
    }
    return { level: h.level, title: h.title, start: h.line, end, body: lines.slice(h.line + 1, end).join('\n') };
  });
}

/** "2. Functional requirements" and "Functional Requirements" compare equal. */
export function normalizeHeading(title: string): string {
  return title
    .toLowerCase()
    .replace(/^[\d.)\s]+/, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const cellText = (cell: string) => cell.replace(/\\\|/g, '|').trim();

export const stripComments = (text: string) => text.replace(/<!--[\s\S]*?-->/g, '');

/**
 * Cleans an AI reply into a document: drops a short preamble before the title
 * and a code fence wrapped around the whole reply.
 */
export function cleanOutput(text: string): string {
  let t = toLf(text).trim();
  const fenced = t.match(/^```(?:markdown|md)?[ \t]*\n([\s\S]*?)\n```$/);
  if (fenced) t = fenced[1].trim();
  const title = t.search(/^# /m);
  if (title > 0 && title < 400) t = t.slice(title);
  return t + '\n';
}

/** Sets one cell in the row whose ID is rowId, in the first table that has a matching column. */
export function setTableCell(md: string, rowId: string, header: (h: string) => boolean, value: string): string {
  const lines = toLf(md).split('\n');
  for (const t of parseTables(md)) {
    const col = t.headers.findIndex((h) => header(cellText(h)));
    if (col < 0) continue;
    t.rows.forEach((r, k) => {
      if (firstCell(r) !== rowId) return;
      const cells = [...r];
      while (cells.length < t.headers.length) cells.push('');
      cells[col] = value.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
      lines[t.rowLines[k]] = `| ${cells.join(' | ')} |`;
    });
  }
  return lines.join('\n');
}

/** Removes table rows for which keep() returns false. */
export function filterTableRows(md: string, keep: (row: string[]) => boolean): string {
  const lines = toLf(md).split('\n');
  const drop = new Set<number>();
  for (const t of parseTables(md)) {
    t.rows.forEach((r, k) => {
      if (!keep(r)) drop.add(t.rowLines[k]);
    });
  }
  return lines.filter((_, i) => !drop.has(i)).join('\n');
}
