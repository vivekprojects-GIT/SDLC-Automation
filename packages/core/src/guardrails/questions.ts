import type { Question } from '../types';
import { cellText, parseTables } from '../util/markdown';

const QUESTION_ID = /^Q-?\d{1,3}$/i;

/** Reads the open-questions table of an intake summary. IDs look like Q1 or Q-01. */
export function parseQuestions(md: string): Question[] {
  const out: Question[] = [];
  for (const t of parseTables(md)) {
    const headers = t.headers.map((h) => cellText(h).toLowerCase());
    if (!headers.some((h) => h.includes('question'))) continue;
    const col = (test: (h: string) => boolean) => headers.findIndex(test);
    const q = col((h) => h.includes('question'));
    const found = col((h) => h.includes('found') || h.includes('source'));
    const sev = col((h) => h.includes('severity'));
    const sug = col((h) => h.includes('suggest'));
    const ans = col((h) => h === 'answer');
    for (const r of t.rows) {
      const id = cellText(r[0] ?? '').replace(/[*_`~]/g, '').trim();
      if (!QUESTION_ID.test(id)) continue;
      const get = (i: number) => (i >= 0 ? cellText(r[i] ?? '') : '');
      out.push({ id, question: get(q), foundIn: get(found), severity: get(sev) || 'Normal', suggested: get(sug), answer: get(ans) });
    }
  }
  return out;
}
