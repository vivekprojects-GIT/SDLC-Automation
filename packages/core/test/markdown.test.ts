import { describe, expect, it } from 'vitest';
import { STAGES, extractItems, parseQuestions, parseStories } from '@sdlc/core';
import { coverage } from '../src/guardrails/checks';
import { cleanOutput, setTableCell } from '../src/util/markdown';
import { FAKE_FIXTURES } from './support/sample-outputs';

describe('markdown parsing', () => {
  it('reads IDs and their references from tables and headings', () => {
    const items = extractItems(FAKE_FIXTURES['test-scenarios']);
    expect(items.find((i) => i.id === 'TS-02')?.refs).toEqual(['FR-01', 'FR-02', 'FR-05']);
    const stories = extractItems(FAKE_FIXTURES.stories).filter((i) => i.prefix === 'US');
    expect(stories.map((s) => s.id)).toEqual(['US-01', 'US-02', 'US-03', 'US-04', 'US-05']);
  });

  it('reads open questions and fills in an answer', () => {
    const qs = parseQuestions(FAKE_FIXTURES.intake);
    expect(qs.map((q) => [q.id, q.severity])).toEqual([['Q1', 'Critical'], ['Q2', 'Critical'], ['Q3', 'Normal']]);
    const filled = setTableCell(FAKE_FIXTURES.intake, 'Q2', (h) => h.toLowerCase() === 'answer', '7 years | per policy');
    expect(parseQuestions(filled).find((q) => q.id === 'Q2')?.answer).toBe('7 years | per policy');
  });

  it('parses stories for the Jira export', () => {
    const epics = parseStories(FAKE_FIXTURES.stories);
    expect(epics[0].stories[0]).toMatchObject({ id: 'US-01', points: 8, covers: ['FR-01', 'FR-02', 'FR-03', 'FR-04'], figma: 'Policy check results' });
    expect(epics[0].stories[0].acceptance).toHaveLength(3);
    expect(epics[0].stories[0].subTasks).toHaveLength(3);
  });

  it('suggests a send-back comment when test cases miss requirements', () => {
    const body = '# Test cases\n\n## Summary\nOne.\n\n## Test cases\n| ID | Type | Scenario | Steps | Test data | Expected result | Covers |\n| --- | --- | --- | --- | --- | --- | --- |\n| TC-01 | Positive | TS-01 | 1. Run | x | ok | TS-01, FR-01 |\n';
    const [result] = coverage({ def: STAGES['test-cases'], body, template: '', answers: {}, resolutions: {}, removed: [], docs: { brd: FAKE_FIXTURES.brd, scenarios: FAKE_FIXTURES['test-scenarios'] }, checklist: [], notes: [] }, 'testCases');
    expect(result.level).toBe('block');
    expect(result.fix).toMatch(/^Add test cases for FR-02, FR-03/);
  });

  it('cleans a reply wrapped in a code fence with a preamble', () => {
    expect(cleanOutput('```markdown\n# Title\n\nBody\n```')).toBe('# Title\n\nBody\n');
    expect(cleanOutput('Here is your document:\n\n# Title\nBody')).toBe('# Title\nBody\n');
  });
});
