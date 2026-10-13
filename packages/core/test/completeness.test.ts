import { describe, expect, it } from 'vitest';
import { inputsCited, intakeCompleteness, parseKeyFacts, partsUsed } from '../src/guardrails/completeness';
import { FAKE_FIXTURES } from './support/sample-outputs';

const intake = FAKE_FIXTURES.intake;
const brd = FAKE_FIXTURES.brd;
// What Copilot actually did in a live run: the BRD dropped the legacy-history requirement.
const brdWithoutHistory = brd
  .split('\n')
  .filter((l) => !l.startsWith('| FR-08'))
  .join('\n');

describe('intake completeness', () => {
  it('reads key facts with their sources and numbers', () => {
    const facts = parseKeyFacts(intake);
    expect(facts).toHaveLength(10);
    expect(facts[0]).toMatchObject({ refs: [{ stem: 'requirement notes', locator: '§2' }], numbers: ['1.25x'] });
    expect(facts[7].refs).toEqual([{ stem: 'kickoff call transcript', locator: '12:40' }]);
  });

  it('passes when every fact reaches the BRD', () => {
    const results = intakeCompleteness(intake, brd, {});
    expect(results.filter((r) => r.level === 'block')).toEqual([]);
    expect(results[0].message).toMatch(/intake facts are carried into the BRD/);
  });

  it('blocks when a fact is missing from the BRD, until it is added or waived', () => {
    const blocked = intakeCompleteness(intake, brdWithoutHistory, {}).filter((r) => r.level === 'block');
    expect(blocked).toHaveLength(1);
    expect(blocked[0].message).toMatch(/three years of legacy checklist history/i);
    expect(blocked[0].options).toEqual(['waive']);
    expect(blocked[0].fix).toMatch(/^Add a requirement/);

    const waived = intakeCompleteness(intake, brdWithoutHistory, { [blocked[0].itemId!]: 'waive' });
    expect(waived.filter((r) => r.level === 'block')).toEqual([]);
  });

  it('warns when a value from a fact is missing', () => {
    const changed = brd.replace('at least 1.25x', 'at least 1.2x');
    const warned = intakeCompleteness(intake, changed, {}).filter((r) => r.level === 'warn');
    expect(warned.some((w) => w.message.includes('1.25x'))).toBe(true);
  });

  it('warns about sections and timestamps of the inputs that the intake never uses', async () => {
    const { readFileSync } = await import('node:fs');
    const { SAMPLE } = await import('./helpers');
    const transcript = readFileSync(`${SAMPLE}/inputs/kickoff-call-transcript.txt`, 'utf8');
    // Like the live run: an intake that uses the transcript only at 21:10.
    const thin = intake.replace(/\[kickoff-call-transcript\.txt (12:40|18:05)\]/g, '[elsewhere]');
    const [result] = partsUsed(thin, [{ rel: 'kickoff-call-transcript.txt', text: transcript }]);
    expect(result.level).toBe('warn');
    expect(result.message).toContain('12:40');
    expect(result.message).toContain('18:05');
    expect(result.message).not.toContain('21:10');
    expect(result.fix).toMatch(/^Check kickoff-call-transcript.txt at/);
  });

  it('blocks an intake summary that skips an input file', () => {
    const inputs = ['requirement-notes.md', 'kickoff-call-transcript.txt', 'legacy-policy-checklist.csv', 'board-minutes.docx'];
    const results = inputsCited(intake, inputs);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ level: 'block', id: 'inputs:board-minutes.docx' });
    expect(inputsCited(intake, inputs.slice(0, 3))[0].level).toBe('pass');
  });
});
