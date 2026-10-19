
const PREFIXES = 'BO|BR|FR|NFR|FD|DA|DS|TD|Q';

/** Matches every ID the pipeline uses, e.g. FR-01, FD-04, DA-07, TD-02. */
export const ID_PATTERN = new RegExp(`\\b(?:${PREFIXES})-\\d{1,4}\\b`, 'g');
const WHOLE_ID = new RegExp(`^(?:${PREFIXES})-\\d{1,4}$`);

export function idsIn(text: string): string[] {
  return [...new Set(text.match(ID_PATTERN) ?? [])];
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
