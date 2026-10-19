import { describe, expect, it } from 'vitest';
import { buildJiraIssues } from '../src/export/jira';
import { idsWithRanges } from '../src/util/ids';

const BRD = `# BRD

## Detailed requirements
| BRD ID | Requirement | Type | Source | Priority |
| --- | --- | --- | --- | --- |
| FR-01 | Start a policy check on submission. | Functional | notes.md §2 | Must |
| FR-02 | Pass the DSCR rule at 1.25x or more. | Validation | notes.md §2 | Should |
| FR-03 | Keep three years of history. | Data | notes.md §4 | Could |
| ~~FR-04~~ | Removed requirement. | Data | ASSUMPTION | Must |

## Functional changes
| Change | System | BRD IDs |
| --- | --- | --- |
| Policy checks on submission. | Policy-check system | FR-01–FR-02 |
`;

const FDD = `# FDD

## Functional design
| FDD ID | BRD ID | Functional change | Systems | Tables | Number of columns | Screens and interfaces |
| --- | --- | --- | --- | --- | --- | --- |
| FD-01 | FR-01 | Start the check when an RM submits. [BRD FR-01] | Policy-check system | POLICY_CHECK | 3 | Application summary |
| FD-02 | FR-02 | Evaluate the **DSCR** rule. [BRD FR-02] | Policy-check system | POLICY_CHECK | 2 | Results |
| FD-03 | FR-03 | Load the legacy history. | Data platform | HISTORY | 8 | None |
| FD-04 | FR-04 | Removed with its requirement. | Data platform | HISTORY | 1 | None |
`;

const TDD = `# TDD

## Technical design items
| TDD ID | Component | Design | Data | Covers |
| --- | --- | --- | --- | --- |
| TD-01 | Submission interface | Call the check on submit. [FDD FD-01] | DA-01–DA-03 | FD-01–FD-02 |
| TD-02 | History load | One-off load. | DA-04 | FD-03 |
| TD-03 | Orphan | Names no FDD item. | — | DA-09 |
`;

describe('Jira import', () => {
  it('fills in ID ranges', () => {
    expect(idsWithRanges('FR-01–FR-03; FR-10 to FR-11, FD-07')).toEqual(['FR-01', 'FR-02', 'FR-03', 'FR-10', 'FR-11', 'FD-07']);
    expect(idsWithRanges('DA-05-DA-03')).toEqual(['DA-05', 'DA-03']);
  });

  it('groups stories under the BRD functional changes, and puts the rest under Other requirements', () => {
    const issues = buildJiraIssues({ brd: BRD, fdd: FDD, tdd: TDD }, []);
    expect(issues.map((i) => `${i.type} ${i.id} < ${i.parent}`)).toEqual([
      'Epic EP-01 < ',
      'Story FD-01 < EP-01',
      'Sub-task TD-01 < FD-01',
      'Story FD-02 < EP-01',
      'Epic EP-02 < ',
      'Story FD-03 < EP-02',
      'Sub-task TD-02 < FD-03',
    ]);
    const [epic, fd01, td01, fd02, other, fd03] = issues;
    expect(epic).toMatchObject({ summary: 'Policy checks on submission', brd: ['FR-01', 'FR-02'] });
    expect(other).toMatchObject({ summary: 'Other requirements', brd: ['FR-03'] });
    // Summaries drop the source references and Markdown; descriptions keep the detail.
    expect(fd01).toMatchObject({ summary: 'Start the check when an RM submits', priority: 'High', labels: ['sdlc-capm', 'FR-01'] });
    expect(fd01.description).toContain('Tables: POLICY_CHECK');
    expect(fd01.description).toContain('FR-01: Start a policy check on submission.');
    expect(fd02).toMatchObject({ summary: 'Evaluate the DSCR rule', priority: 'Medium' });
    expect(fd03.priority).toBe('Low');
    // A sub-task building two stories sits under the first and names the other.
    expect(td01).toMatchObject({ summary: 'Submission interface: Call the check on submit', brd: ['FR-01', 'FR-02'] });
    expect(td01.description).toContain('Also builds: FD-02');
  });

  it('leaves out requirements the reviewer removed', () => {
    const issues = buildJiraIssues({ brd: BRD, fdd: FDD, tdd: TDD }, ['FR-03']);
    expect(issues.map((i) => i.id)).toEqual(['EP-01', 'FD-01', 'TD-01', 'FD-02']);
  });
});
