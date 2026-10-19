import { describe, expect, it } from 'vitest';
import { STAGES, extractItems, parseQuestions } from '@sdlc/core';
import { dataMappings, designCoverage, scopeDecisions } from '../src/guardrails/checks';
import { cleanOutput, setTableCell } from '../src/util/markdown';
import { FAKE_FIXTURES } from './support/sample-outputs';

const input = (key: keyof typeof STAGES, body: string) => ({ def: STAGES[key], body, template: '', answers: {}, resolutions: {}, removed: [], docs: { brd: FAKE_FIXTURES.brd, fdd: FAKE_FIXTURES.fdd }, checklist: [], notes: [] });

describe('markdown parsing', () => {
  it('reads IDs and their references from tables', () => {
    const design = extractItems(FAKE_FIXTURES.fdd).filter((i) => i.prefix === 'FD');
    expect(design.map((d) => d.id)).toEqual(['FD-01', 'FD-02', 'FD-03', 'FD-04', 'FD-05', 'FD-06', 'FD-07', 'FD-08']);
    expect(design.find((d) => d.id === 'FD-05')?.refs).toEqual(['FR-05']);
    const mapping = extractItems(FAKE_FIXTURES.dsd).find((i) => i.id === 'DS-02');
    expect(mapping).toMatchObject({ prefix: 'DS', refs: ['DA-02'] });
  });

  it('reads open questions and fills in an answer', () => {
    const qs = parseQuestions(FAKE_FIXTURES.intake);
    expect(qs.map((q) => [q.id, q.severity])).toEqual([['Q1', 'Critical'], ['Q2', 'Critical'], ['Q3', 'Normal']]);
    const filled = setTableCell(FAKE_FIXTURES.intake, 'Q2', (h) => h.toLowerCase() === 'answer', '7 years | per policy');
    expect(parseQuestions(filled).find((q) => q.id === 'Q2')?.answer).toBe('7 years | per policy');
  });

  it('suggests a send-back comment when the FDD misses BRD requirements', () => {
    const body = '# FDD\n\n## Functional design\n| FDD ID | BRD ID | Functional change |\n| --- | --- | --- |\n| FD-01 | FR-01 | Add the DSCR rule |\n';
    const [result] = designCoverage(input('fdd', body));
    expect(result.level).toBe('block');
    expect(result.fix).toMatch(/^Add functional design items for FR-02, FR-03/);
  });

  it('blocks a data attribute with no source-to-destination mapping', () => {
    const body = FAKE_FIXTURES.dsd.split('\n').filter((l) => !l.startsWith('| DS-04')).join('\n');
    const [result] = dataMappings(body);
    expect(result.level).toBe('block');
    expect(result.message).toContain('DA-04');
  });

  it('reads each requirement’s SIT scope decision', () => {
    const [ok] = scopeDecisions(input('sit-strategy', FAKE_FIXTURES['sit-strategy']), 'SIT');
    expect(ok).toMatchObject({ level: 'pass', message: 'SIT scope decided for every requirement: 8 in, 0 out' });
    const [uat] = scopeDecisions(input('uat-strategy', FAKE_FIXTURES['uat-strategy']), 'UAT');
    expect(uat.message).toBe('UAT scope decided for every requirement: 7 in, 1 out');
  });

  it('cleans a reply wrapped in a code fence with a preamble', () => {
    expect(cleanOutput('```markdown\n# Title\n\nBody\n```')).toBe('# Title\n\nBody\n');
    expect(cleanOutput('Here is your document:\n\n# Title\nBody')).toBe('# Title\nBody\n');
  });
});
