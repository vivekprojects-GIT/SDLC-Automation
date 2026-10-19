import { promises as fs } from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { Pipeline, PipelineError, type StageKey } from '@sdlc/core';
import { FakeProvider } from './support/fake-provider';
import { REPO_ROOT, reviewer, tempProject } from './helpers';

async function open(dir: string, provider = new FakeProvider()) {
  const events: string[] = [];
  const p = await Pipeline.open({ toolRoot: REPO_ROOT, projectDir: dir, provider, onEvent: (e) => e.type === 'progress' && events.push(`${e.stage}: ${e.message}`) });
  return { p, events };
}

async function approveIntake(p: Pipeline) {
  await p.run('intake');
  await p.answer('Q1', '$5M, confirmed by Credit Policy', reviewer);
  await p.answer('Q2', '7 years', reviewer);
  await p.answer('Q3', 'WCAG 2.1 AA', reviewer);
  await p.approve('intake', reviewer);
}

async function approveBrd(p: Pipeline, decision: 'keep' | 'remove' = 'keep') {
  await p.run('brd');
  await p.resolve('brd', 'FR-06', decision, reviewer);
  await p.approve('brd', reviewer);
}

const LATER: StageKey[] = ['fdd', 'dsd', 'tdd', 'sit-strategy', 'uat-strategy'];

/** The visible text of a .docx, and the tabs and rows of an .xlsx. */
async function wordText(file: string) {
  const zip = await JSZip.loadAsync(await fs.readFile(file));
  return (await zip.file('word/document.xml')!.async('string')).replace(/<[^>]+>/g, '');
}
async function workbook(file: string) {
  return XLSX.read(await fs.readFile(file));
}
const rowsOf = (wb: XLSX.WorkBook, tab: string) => XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[tab], { defval: '' });

describe('pipeline end to end with the fake AI', () => {
  it('runs every PDLC Planning step behind its review gate and exports the Planview/PPP deliverables', async () => {
    const dir = await tempProject();
    const { p, events } = await open(dir);

    expect(p.status('intake')).toBe('ready');
    expect(p.status('brd')).toBe('locked');
    await expect(p.run('brd')).rejects.toThrow(PipelineError);

    // Intake: critical questions block approval until answered.
    await p.run();
    expect(p.status('intake')).toBe('review');
    expect(events.some((e) => e.includes('Reading the input files'))).toBe(true);
    await expect(p.approve('intake', reviewer)).rejects.toThrow(/can't be approved/);
    await p.answer('Q1', '$5M, confirmed by Credit Policy', reviewer);
    await p.answer('Q2', '7 years', reviewer);
    await p.answer('Q3', 'WCAG 2.1 AA', reviewer);
    expect(await p.approve('intake', reviewer)).toBe('brd');
    expect(await fs.readFile(p.documentPath('intake'), 'utf8')).toContain('7 years');

    // BRD: FR-06 has no source, so a reviewer must decide. Send it back once first.
    await p.run('brd');
    let snap = await p.snapshot();
    const brd = snap.stages.find((s) => s.key === 'brd')!;
    expect(brd.checks.find((c) => c.itemId === 'FR-06')?.level).toBe('block');
    expect(brd.canApprove).toBe(false);
    await p.sendBack('brd', 'Add the date of the kickoff call.', reviewer);
    snap = await p.snapshot();
    expect(snap.stages.find((s) => s.key === 'brd')!.version).toBe('0.2');
    expect(snap.documents.brd).toContain('Revised for the reviewer');
    await p.resolve('brd', 'FR-06', 'keep', reviewer);
    expect(await p.approve('brd', reviewer)).toBe('fdd');

    // FDD, DRD/DSD, TDD and both QA strategies: each must pass its own checks.
    for (const key of LATER) {
      await p.run(key);
      const s = (await p.snapshot()).stages.find((x) => x.key === key)!;
      expect(s.checks.filter((c) => c.level === 'block')).toEqual([]);
      await p.approve(key, reviewer);
    }

    snap = await p.snapshot();
    expect(snap.exportReady).toBe(true);
    expect(snap.coverage).toEqual({
      requirements: 8,
      withDesign: 8,
      withData: 4,
      withTechnical: 8,
      sitDecided: 8,
      uatDecided: 8,
      fullyTraced: 8,
      missing: { design: [], technical: [], sit: [], uat: [] },
    });

    const result = await p.exportAll(reviewer);
    expect(result.files).toEqual([
      'outputs/deliverables/00-intake.docx',
      'outputs/deliverables/01-brd.xlsx',
      'outputs/deliverables/02-fdd.xlsx',
      'outputs/deliverables/03-dsd.xlsx',
      'outputs/deliverables/04-tdd.docx',
      'outputs/deliverables/05-sit-strategy.docx',
      'outputs/deliverables/06-uat-strategy.docx',
      'outputs/deliverables/rtm.xlsx',
    ]);
    expect(result.matrix.find((r) => r.id === 'FR-03')).toMatchObject({ type: 'Functional', design: ['FD-03'], data: ['DA-02'], technical: ['TD-03'], sit: 'Yes', uat: 'Yes' });
    expect(result.matrix.find((r) => r.id === 'FR-08')).toMatchObject({ sit: 'Yes', uat: 'No' });

    // The BRD is an Excel workbook with document control and one tab per section, as MUFG keeps it.
    const brdBook = await workbook(path.join(dir, 'outputs/deliverables/01-brd.xlsx'));
    expect(brdBook.SheetNames).toEqual([
      'Document control',
      'Stakeholders',
      'Requirement sessions',
      'Business objectives',
      'High-level scope',
      'Current state',
      'Future state',
      'Data flows',
      'Detailed requirements',
      'Non-functional requirements',
      'Functional changes',
      'Impacted systems',
      'System interfaces',
      'Report requirements',
      'In scope and out of scope',
      'Assumptions and constraints',
    ]);
    const reqs = rowsOf(brdBook, 'Detailed requirements');
    expect(reqs).toHaveLength(8);
    expect(reqs[0]).toMatchObject({ 'BRD ID': 'FR-01', Type: 'Functional', Priority: 'Must' });
    expect(rowsOf(brdBook, 'Document control').find((r) => r.Field === 'Approved by')?.Value).toBe('Test Reviewer (Business analyst)');

    // The DSD keeps the DRD and the source-to-destination mapping on their own tabs.
    const dsdBook = await workbook(path.join(dir, 'outputs/deliverables/03-dsd.xlsx'));
    expect(dsdBook.SheetNames).toEqual(expect.arrayContaining(['Data requirements (DRD)', 'Data sourcing', 'Manual workarounds']));
    expect(rowsOf(dsdBook, 'Data sourcing')[1]).toMatchObject({ 'Mapping ID': 'DS-02', 'Transformation logic': 'Sum of open loans for the borrower' });

    // The TDD is a Word document with the document-control table and the content.
    const tdd = await wordText(path.join(dir, 'outputs/deliverables/04-tdd.docx'));
    expect(tdd).toContain('Document control');
    expect(tdd).toContain('Technical Design Document: Commercial Loan Policy Check');
    expect(tdd).toContain('AUDIT_LOAD');
    expect(tdd).toContain('Test Reviewer (IT lead)');

    // The RTM traces each BRD requirement and leaves the T2BAU columns for the BAU owner.
    const rtm = await workbook(path.join(dir, 'outputs/deliverables/rtm.xlsx'));
    expect(rtm.SheetNames).toEqual(['RTM', 'Coverage', 'Document control']);
    const rtmRows = rowsOf(rtm, 'RTM');
    expect(Object.keys(rtmRows[0])).toEqual(expect.arrayContaining(['BRD ID', 'FDD', 'Data attributes', 'TDD', 'In SIT scope', 'In UAT scope', 'BAU owner', 'Transition activity']));
    expect(rtmRows.find((r) => r['BRD ID'] === 'FR-03')).toMatchObject({ FDD: 'FD-03', 'Data attributes': 'DA-02', TDD: 'TD-03', 'Trace status': 'Complete', 'BAU owner': '' });

    for (const f of [...result.files, 'outputs/rtm.md', 'outputs/rtm.csv']) await fs.access(path.join(dir, f));
    expect((await p.snapshot()).exportFiles).toEqual(expect.arrayContaining(result.files));

    const audit = await fs.readFile(path.join(dir, 'outputs', 'audit-log.csv'), 'utf8');
    expect(audit).toContain('sent back');
    expect(audit).toContain(',kept,');
    expect(audit).toContain('8 deliverables; 8 of 8 requirements fully traced');
  });

  it('writes a missing TDD item automatically before the reviewer sees the draft', async () => {
    const dir = await tempProject();
    const fixtures = (await import('./support/sample-outputs')).FAKE_FIXTURES;
    // When asked only for the missing items, this stand-in returns just the forgotten design item.
    const missingRow = fixtures.tdd.split('\n').find((l) => l.startsWith('| TD-08'))!;
    const header = '| TDD ID | Component | Design | Data | Covers |\n| --- | --- | --- | --- | --- |';
    class GapFiller extends FakeProvider {
      override async complete(messages: Parameters<FakeProvider['complete']>[0]) {
        if (/^MODE: gaps$/m.test(messages[0].content)) return `${header}\n${missingRow}\n`;
        return super.complete(messages);
      }
    }
    const { p } = await open(dir, new GapFiller());
    await approveIntake(p);
    await approveBrd(p);
    for (const key of ['fdd', 'dsd'] as StageKey[]) {
      await p.run(key);
      await p.approve(key, reviewer);
    }
    const original = fixtures.tdd;
    fixtures.tdd = original.split('\n').filter((l) => !l.startsWith('| TD-08')).join('\n');
    try {
      await p.run('tdd');
    } finally {
      fixtures.tdd = original;
    }
    const st = (await p.snapshot()).stages.find((s) => s.key === 'tdd')!;
    expect(st.history.at(-1)?.note).toContain('missing items written automatically for FD-08');
    expect(st.checks.find((c) => c.id === 'coverage')?.level).toBe('pass');
  });

  it('blocks a QA strategy that leaves a requirement undecided', async () => {
    const dir = await tempProject();
    const fixtures = (await import('./support/sample-outputs')).FAKE_FIXTURES;
    const { p } = await open(dir);
    await approveIntake(p);
    await approveBrd(p);
    for (const key of ['fdd', 'dsd', 'tdd'] as StageKey[]) {
      await p.run(key);
      await p.approve(key, reviewer);
    }
    const original = fixtures['sit-strategy'];
    fixtures['sit-strategy'] = original.split('\n').filter((l) => !l.startsWith('| FR-07')).join('\n');
    try {
      await p.run('sit-strategy');
    } finally {
      fixtures['sit-strategy'] = original;
    }
    const st = (await p.snapshot()).stages.find((s) => s.key === 'sit-strategy')!;
    const scope = st.checks.find((c) => c.id === 'scope')!;
    expect(scope.level).toBe('block');
    expect(scope.message).toContain('FR-07');
    expect(st.canApprove).toBe(false);
  });

  it('removing an unsourced requirement takes it out of coverage', async () => {
    const dir = await tempProject();
    const { p } = await open(dir);
    await approveIntake(p);
    await approveBrd(p, 'remove');
    expect(await p.readDocument('brd')).toContain('~~FR-06~~');
    expect((await p.snapshot()).coverage.requirements).toBe(7);
  });

  it('reopening an approved document marks later steps stale', async () => {
    const dir = await tempProject();
    const { p } = await open(dir);
    await approveIntake(p);
    await approveBrd(p);
    await p.run('fdd');

    await p.reopen('brd', reviewer, 'Scope changed');
    expect(p.status('brd')).toBe('review');
    expect(p.status('fdd')).toBe('stale');
    await expect(p.run('fdd')).rejects.toThrow(/every step before it/);
    await p.approve('brd', reviewer);
    expect(p.nextRunnable()).toBe('fdd');
    await p.run('fdd');
    expect((await p.snapshot()).stages.find((s) => s.key === 'fdd')!.version).toBe('0.2');
  });

  it('picks up direct edits by the reviewer', async () => {
    const dir = await tempProject();
    const { p } = await open(dir);
    await p.run('intake');
    const file = p.documentPath('intake');
    const text = await fs.readFile(file, 'utf8');
    await fs.writeFile(file, text.replace('## Key facts', '## Key facts\n- Added by the reviewer.'));
    expect(await p.syncEdits('intake', reviewer)).toBe(true);
    expect((await p.snapshot()).stages[0].history.at(-1)?.action).toBe('edited');
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
