import { cellId, idsIn, prefixOf } from '../util/ids';
import { cellText, parseSections, parseTables } from '../util/markdown';

/** Anything with an ID: a table row (FR-01, TC-03) or a heading section (EP-01, US-02). */
export interface TraceItem {
  id: string;
  prefix: string;
  /** Other IDs mentioned in the row or section. */
  refs: string[];
  struck: boolean;
  kind: 'row' | 'section';
  cells?: string[];
  headers?: string[];
  title?: string;
  body?: string;
}

export function extractItems(md: string): TraceItem[] {
  const items: TraceItem[] = [];
  for (const t of parseTables(md)) {
    for (const r of t.rows) {
      const { id, struck } = cellId(r[0] ?? '');
      if (!id) continue;
      items.push({ id, prefix: prefixOf(id), refs: idsIn(r.slice(1).join(' ')).filter((x) => x !== id), struck, kind: 'row', cells: r, headers: t.headers });
    }
  }
  for (const s of parseSections(md)) {
    const m = s.title.replace(/[*_`]/g, '').match(/^((?:EP|US)-\d{1,4})\b[\s:.-]*(.*)$/);
    if (!m || s.level < 2 || s.level > 3) continue;
    items.push({ id: m[1], prefix: prefixOf(m[1]), refs: idsIn(s.body).filter((x) => x !== m[1]), struck: s.title.includes('~~'), kind: 'section', title: m[2].trim(), body: s.body });
  }
  return items;
}

/** The text of a row's cell under the first header that matches. */
export function cellFor(item: TraceItem, header: RegExp): string {
  if (!item.headers || !item.cells) return '';
  const i = item.headers.findIndex((h) => header.test(cellText(h)));
  return i >= 0 ? cellText(item.cells[i] ?? '') : '';
}

/** Functional requirement IDs in a BRD, without removed or struck-through ones. */
export function requirementIds(brd: string | undefined, removed: string[]): string[] {
  if (!brd) return [];
  return [...new Set(extractItems(brd).filter((i) => i.prefix === 'FR' && !i.struck && !removed.includes(i.id)).map((i) => i.id))];
}
