import { describe, expect, it } from 'vitest';
import { sources } from '../src/guardrails/checks';
import { FAKE_FIXTURES } from './support/sample-outputs';

// Q1 answered, Q2 and Q3 open.
const intake = FAKE_FIXTURES.intake.replace('| $5M, as written in the policy notes | |', '| $5M, as written in the policy notes | $5M, confirmed with Credit Policy |');
const brd = (rows: string[]) => ['| ID | Requirement | Source |', '| --- | --- | --- |', ...rows].join('\n');
const blocked = (rows: string[]) => sources(brd(rows), ['FR', 'NFR'], 'requirement', {}, intake).filter((c) => c.level === 'block').map((c) => c.itemId);

describe('requirement sources', () => {
  it('accepts input files and answered intake questions', () => {
    expect(blocked(['| FR-01 | Senior sign-off above $5M. | requirement-notes.md §3 |', '| NFR-01 | Keep records. | PRD §Assumptions; intake Q1 |'])).toEqual([]);
  });

  it('blocks rows backed only by an assumption or an unanswered question', () => {
    expect(blocked(['| NFR-01 | Retain records for a period to be agreed. | ASSUMPTION; intake Q2 |', '| NFR-02 | Meet an accessibility standard. | intake Q3 |', '| NFR-03 | Something. | — |'])).toEqual(['NFR-01', 'NFR-02', 'NFR-03']);
  });
});
