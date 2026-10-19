
const PREFIXES = 'BO|BR|FR|NFR|FD|DA|DS|TD|Q';

/** Matches every ID the pipeline uses, e.g. FR-01, FD-04, DA-07, TD-02. */
export const ID_PATTERN = new RegExp(`\\b(?:${PREFIXES})-\\d{1,4}\\b`, 'g');
const WHOLE_ID = new RegExp(`^(?:${PREFIXES})-\\d{1,4}$`);

export function idsIn(text: string): string[] {
  return [...new Set(text.match(ID_PATTERN) ?? [])];
}

const RANGE = new RegExp(`\\b(${PREFIXES})-(\\d{1,4})\\s*(?:[–—-]|to)\\s*(?:\\1-)?(\\d{1,4})\\b`, 'g');

/** IDs in a text, with ranges such as "FR-01–FR-06" or "FR-10 to FR-14" filled in. */
export function idsWithRanges(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(RANGE)) {
    const [from, to] = [Number(m[2]), Number(m[3])];
    if (to < from || to - from > 500) continue;
    for (let n = from; n <= to; n++) out.add(`${m[1]}-${String(n).padStart(m[2].length, '0')}`);
  }
  for (const id of idsIn(text)) out.add(id);
  return [...out];
}

/** Reads the ID out of a table's first cell, ignoring bold, code and strike-through marks. */
export function cellId(cell: string): { id: string | null; struck: boolean } {
  const struck = cell.includes('~~');
  const text = cell.replace(/[*_~`]/g, '').trim();
  return { id: WHOLE_ID.test(text) ? text : null, struck };
}

export function prefixOf(id: string): string {
  return id.slice(0, id.lastIndexOf('-'));
}

export function numberOf(id: string): number {
  return Number(id.slice(id.lastIndexOf('-') + 1));
}

export function maxNumber(ids: string[], prefix: string): number {
  return ids.filter((id) => prefixOf(id) === prefix).reduce((max, id) => Math.max(max, numberOf(id)), 0);
}

export function padId(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(2, '0')}`;
}
