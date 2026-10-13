/** Drafts are 0.x; approval moves to the next whole version (0.3 -> 1.0, 1.2 -> 2.0). */
export const FIRST_DRAFT = '0.1';

function parse(v: string): [number, number] {
  const [major, minor] = v.split('.').map((n) => Number(n) || 0);
  return [major ?? 0, minor ?? 0];
}

export function nextRevision(v: string): string {
  const [major, minor] = parse(v);
  return `${major}.${minor + 1}`;
}

export function approvedVersion(v: string): string {
  const [major] = parse(v);
  return `${major + 1}.0`;
}
