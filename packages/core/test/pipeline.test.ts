import { promises as fs } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { Pipeline, PipelineError, type StageKey } from '@sdlc/core';
import { FakeProvider } from './support/fake-provider';
import { REPO_ROOT, reviewer, tempProject } from './helpers';

async function open(dir: string, provider = new FakeProvider()) {
  const events: string[] = [];
  const p = await Pipeline.open({ toolRoot: REPO_ROOT, projectDir: dir, provider, onEvent: (e) => e.type === 'progress' && events.push(`${e.stage}: ${e.message}`) });
  return { p, events };
}

async function runAndApprove(p: Pipeline, key: StageKey) {
  await p.run(key);
  return p.approve(key, reviewer);
}

describe('pipeline end to end with the fake AI', () => {
  it('runs every step behind its review gate and exports a traceable backlog', async () => {
    const dir = await tempProject();
    const { p, events } = await open(dir);

    expect(p.status('intake')).toBe('ready');
    expect(p.status('prd')).toBe('locked');
    await expect(p.run('prd')).rejects.toThrow(PipelineError);

    // Intake: critical questions block approval until answered.
    await p.run();
    expect(p.status('intake')).toBe('review');
    expect(events.some((e) => e.includes('Reading the input files'))).toBe(true);
    await expect(p.approve('intake', reviewer)).rejects.toThrow(/can't be approved/);
    await p.answer('Q1', '$5M, confirmed by Credit Policy', reviewer);
    await p.answer('Q2', '7 years', reviewer);
    await p.answer('Q3', 'WCAG 2.1 AA', reviewer);
    expect(await p.approve('intake', reviewer)).toBe('prd');
    const intake = await fs.readFile(p.documentPath('intake'), 'utf8');
    expect(intake).toContain('version: "1.0"');
    expect(intake).toContain('7 years');

    // PRD: send back once, then approve.
    await p.run('prd');
    await p.sendBack('prd', 'Add a target: 100% of applications checked before credit review.', reviewer);
    let snap = await p.snapshot();
    const prd = snap.stages.find((s) => s.key === 'prd')!;
    expect(prd.version).toBe('0.2');
    expect(snap.documents.prd).toContain('Revised for the reviewer');
    await p.approve('prd', reviewer);

    // BRD: FR-06 has no source, so a reviewer must decide.
    await p.run('brd');
    snap = await p.snapshot();
    const brd = snap.stages.find((s) => s.key === 'brd')!;
    const flag = brd.checks.find((c) => c.itemId === 'FR-06');
    expect(flag?.level).toBe('block');
    expect(brd.canApprove).toBe(false);
    await p.resolve('brd', 'FR-06', 'keep', reviewer);
    await p.approve('brd', reviewer);

    for (const key of ['test-scenarios', 'test-cases', 'stories'] as StageKey[]) {
      await p.run(key);
      const s = (await p.snapshot()).stages.find((x) => x.key === key)!;
      expect(s.checks.filter((c) => c.level === 'block')).toEqual([]);
      await p.approve(key, reviewer);
    }

    snap = await p.snapshot();
    expect(snap.exportReady).toBe(true);
    expect(snap.coverage).toEqual({ requirements: 8, withScenario: 8, withTestCase: 8, withStory: 8, fullyTraced: 8, missing: { scenarios: [], testCases: [], stories: [] } });

    const result = await p.exportAll(reviewer);
    expect(result.counts).toEqual({ epics: 3, stories: 5, subTasks: 13 });
    expect(result.jiraCsv).toContain('US-01,EP-01,Story,Check policy rules on submit');
    expect(result.jiraCsv).toContain('Sub-task');
    expect(result.matrix.find((r) => r.id === 'FR-05')?.testCases).toEqual(['TC-03', 'TC-08', 'TC-13']);
    for (const f of result.files) await fs.access(path.join(dir, f));

    const audit = await fs.readFile(path.join(dir, 'outputs', 'audit-log.csv'), 'utf8');
    expect(audit.split('\n')[0]).toBe('timestamp,stage,action,actor,version,detail\r');
    expect(audit).toContain('sent back');
    expect(audit).toContain(',kept,');
    expect(audit).toContain('exported');
  });

  it('removing an unsourced requirement takes it out of coverage', async () => {
    const dir = await tempProject();
    const { p } = await open(dir);
    await p.run('intake');
    await p.answer('Q1', '$5M', reviewer);
    await p.answer('Q2', '7 years', reviewer);
    await p.answer('Q3', 'WCAG 2.1 AA', reviewer);
    await p.approve('intake', reviewer);
    await runAndApprove(p, 'prd');
    await p.run('brd');
    await p.resolve('brd', 'FR-06', 'remove', reviewer);
    await p.approve('brd', reviewer);
    expect(await p.readDocument('brd')).toContain('~~FR-06~~');
    const snap = await p.snapshot();
    expect(snap.coverage.requirements).toBe(7);
  });

  it('reopening an approved document marks later steps stale', async () => {
    const dir = await tempProject();
    const { p } = await open(dir);
    await p.run('intake');
    await p.answer('Q1', '$5M', reviewer);
    await p.answer('Q2', '7 years', reviewer);
    await p.answer('Q3', 'WCAG 2.1 AA', reviewer);
    await p.approve('intake', reviewer);
    await runAndApprove(p, 'prd');
    await p.run('brd');

    await p.reopen('prd', reviewer, 'Scope changed');
    expect(p.status('prd')).toBe('review');
    expect(p.status('brd')).toBe('stale');
    await expect(p.run('brd')).rejects.toThrow(/every step before it/);
    await p.approve('prd', reviewer);
    expect(p.nextRunnable()).toBe('brd');
    await p.run('brd');
    expect((await p.snapshot()).stages.find((s) => s.key === 'brd')!.version).toBe('0.2');
  });

  it('picks up direct edits by the reviewer', async () => {
    const dir = await tempProject();
    const { p } = await open(dir);
    await p.run('intake');
    const file = p.documentPath('intake');
    const text = await fs.readFile(file, 'utf8');
    await fs.writeFile(file, text.replace('## Key facts', '## Key facts\n- Added by the reviewer.'));
    expect(await p.syncEdits('intake', reviewer)).toBe(true);
    const snap = await p.snapshot();
    expect(snap.stages[0].history.at(-1)?.action).toBe('edited');
  });

  it('registers a document written in Copilot chat', async () => {
    const dir = await tempProject();
    const { p } = await open(dir, undefined as never);
    p.setProvider(undefined);
    await expect(p.run('intake')).rejects.toThrow(/No AI is connected/);
    const { file } = await p.promptFor('intake');
    expect(file).toBe('outputs/00-intake.md');
    await fs.mkdir(path.join(dir, 'outputs'), { recursive: true });
    const { FAKE_FIXTURES } = await import('./support/sample-outputs');
    await fs.writeFile(path.join(dir, file), FAKE_FIXTURES.intake);
    await p.register('intake', { name: 'Copilot chat' });
    expect(p.status('intake')).toBe('review');
  });
});
