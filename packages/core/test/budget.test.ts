import { promises as fs } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { Pipeline, messageTokens, type LlmMessage, type LlmProvider, type StageKey } from '@sdlc/core';
import { FAKE_FIXTURES } from './support/sample-outputs';
import { REPO_ROOT, reviewer, tempProject } from './helpers';

const REQUIREMENTS = ['FR-01', 'FR-02', 'FR-03', 'FR-04', 'FR-05', 'FR-06', 'FR-07', 'FR-08'];
const DESIGN = ['FD-01', 'FD-02', 'FD-03', 'FD-04', 'FD-05', 'FD-06', 'FD-07', 'FD-08'];
const pad = (n: number) => String(n).padStart(2, '0');
const list = (text: string | undefined) => (text ? text.split(/,\s*/).map((s) => s.trim()) : []);

/** How the stand-in writes each kind of item: its table and the noun the piece requests use. */
const KINDS = {
  fdd: { prefix: 'FD', units: 'requirements', all: REQUIREMENTS, header: '| FDD ID | BRD ID | Functional change | Systems | Tables | Number of columns | Screens and interfaces |\n| --- | --- | --- | --- | --- | --- | --- |', row: (id: string, n: string) => `| FD-${n} | ${id} | Change | System | TABLE | 1 | None |` },
  tdd: { prefix: 'TD', units: 'functional design items', all: DESIGN, header: '| TDD ID | Component | Design | Data | Covers |\n| --- | --- | --- | --- | --- |', row: (id: string, n: string) => `| TD-${n} | Component | Design | TABLE | ${id} |` },
} as const;

/**
 * A stand-in AI that writes FDD and TDD items only for what each request asks for, so the tests can
 * see how a document is split, joined and gap-filled. Other steps get the sample outputs.
 */
class PiecesProvider implements LlmProvider {
  readonly name = 'Pieces test AI';
  calls: { stage: string; mode: string; user: string; tokens: number }[] = [];
  constructor(private readonly opts: { only: 'fdd' | 'tdd'; drop?: string[]; cutOff?: boolean }) {}

  async complete(messages: LlmMessage[]): Promise<string> {
    const stage = messages[0].content.match(/^STAGE:\s*(\S+)/m)![1];
    const mode = messages[0].content.match(/^MODE:\s*(\S+)/m)![1];
    const user = messages[1].content;
    this.calls.push({ stage, mode, user, tokens: messageTokens(messages) });
    const first = this.calls.filter((c) => c.stage === stage).length === 1;
    if (stage === this.opts.only) return this.items(this.opts.only, user, mode, first);
    return FAKE_FIXTURES[stage as StageKey];
  }

  private items(stage: 'fdd' | 'tdd', user: string, mode: string, first: boolean): string {
    const k = KINDS[stage];
    const noun = stage === 'fdd' ? 'functional design items' : 'technical design items';
    let ids =
      mode === 'gaps'
        ? list(user.match(new RegExp(`still have no ${noun}: ([^.]+)\\.`))?.[1])
        : mode === 'chunk'
          ? list(user.match(new RegExp(`Write ${noun} only for these ${k.units}: ([^.]+)\\.`))?.[1])
          : [...k.all];
    if (first && this.opts.drop) ids = ids.filter((f) => !this.opts.drop!.includes(f));
    let n = Number(user.match(new RegExp(`starting at ${k.prefix}-(\\d+)`))?.[1] ?? 1);
    const rows = ids.map((id) => k.row(id, pad(n++)));
    if (first && this.opts.cutOff) rows.splice(rows.length - 1, 1, `| ${k.prefix}-${pad(n - 1)} | Component | Half a re`);
    return `# Design\n\n## Summary\nSome items.\n\n## Items\n${k.header}\n${rows.join('\n')}\n`;
  }
}

/** Replaces the project's budget block. */
async function setBudget(dir: string, budget: Record<string, number>) {
  const file = path.join(dir, 'project.yaml');
  const yaml = await fs.readFile(file, 'utf8');
  const block = `budget:\n${Object.entries(budget).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n`;
  await fs.writeFile(file, yaml.replace(/budget:[\s\S]*$/, block));
}

/** Approves every step before `until`. */
async function approveUntil(p: Pipeline, until: StageKey) {
  await p.run('intake');
  await p.answer('Q1', '$5M', reviewer);
  await p.answer('Q2', '7 years', reviewer);
  await p.answer('Q3', 'WCAG 2.1 AA', reviewer);
  await p.approve('intake', reviewer);
  await p.run('brd');
  await p.resolve('brd', 'FR-06', 'keep', reviewer);
  await p.approve('brd', reviewer);
  for (const key of ['fdd', 'dsd'] as StageKey[]) {
    if (key === until) return;
    await p.run(key);
    await p.approve(key, reviewer);
  }
}

async function open(provider: LlmProvider, until: StageKey, budget?: Record<string, number>) {
  const dir = await tempProject();
  const p = await Pipeline.open({ toolRoot: REPO_ROOT, projectDir: dir, provider });
  await approveUntil(p, until);
  if (budget) {
    await setBudget(dir, budget);
    await p.reload();
  }
  return { p, dir };
}

const stageOf = async (p: Pipeline, key: StageKey) => (await p.snapshot()).stages.find((s) => s.key === key)!;
const coverageCheck = async (p: Pipeline, key: StageKey) => (await stageOf(p, key)).checks.find((c) => c.id === 'coverage')?.level;

describe('long documents', () => {
  it('writes the FDD a few requirements at a time, then joins it', async () => {
    const provider = new PiecesProvider({ only: 'fdd' });
    // 8 requirements at about 300 tokens each would not fit one 600-token reply: 2 requirements per piece.
    const { p } = await open(provider, 'fdd', { maxOutputTokens: 600 });
    await p.run('fdd');
    const pieces = provider.calls.filter((c) => c.stage === 'fdd' && c.mode === 'chunk');
    expect(pieces).toHaveLength(4);
    expect(pieces[0].user).toContain('Write functional design items only for these requirements: FR-01, FR-02.');
    // A piece carries only the BRD rows it needs.
    expect(pieces[0].user).toContain('| FR-01 |');
    expect(pieces[0].user).not.toContain('| FR-08 |');
    const doc = (await p.readDocument('fdd'))!;
    const ids = doc.match(/^\| FD-\d+/gm)!;
    expect(new Set(ids).size).toBe(8);
    expect(doc).toContain('## Summary\n8 functional design items covering 8 requirements.');
    expect(await coverageCheck(p, 'fdd')).toBe('pass');
    expect((await stageOf(p, 'fdd')).history.at(-1)?.note).toContain('written in 4 pieces');
  });

  it('writes the TDD a few functional design items at a time', async () => {
    const provider = new PiecesProvider({ only: 'tdd' });
    // 8 design items at about 350 tokens each: 2 items per 700-token reply.
    const { p } = await open(provider, 'tdd', { maxOutputTokens: 700 });
    await p.run('tdd');
    const pieces = provider.calls.filter((c) => c.stage === 'tdd' && c.mode === 'chunk');
    expect(pieces).toHaveLength(4);
    expect(pieces[0].user).toContain('Write technical design items only for these functional design items: FD-01, FD-02.');
    expect(pieces[0].user).toContain('| FD-01 |');
    expect(pieces[0].user).not.toContain('| FD-08 |');
    expect(await coverageCheck(p, 'tdd')).toBe('pass');
  });

  it('writes missing items automatically before the reviewer sees the draft', async () => {
    const provider = new PiecesProvider({ only: 'fdd', drop: ['FR-07', 'FR-08'] });
    const { p, dir } = await open(provider, 'fdd');
    await p.run('fdd');
    const calls = provider.calls.filter((c) => c.stage === 'fdd');
    expect(calls.map((c) => c.mode)).toEqual(['draft', 'gaps']);
    expect(calls[1].user).toContain('These requirements still have no functional design items: FR-07, FR-08.');
    expect(calls[1].user).toContain('starting at FD-07');
    expect(await coverageCheck(p, 'fdd')).toBe('pass');
    expect((await stageOf(p, 'fdd')).history.at(-1)?.note).toContain('missing items written automatically for FR-07, FR-08');
    expect(await fs.readFile(path.join(dir, 'outputs', 'audit-log.csv'), 'utf8')).toContain('missing items written automatically for FR-07, FR-08');
  });

  it('drops a row the reply stopped in the middle of, and writes that item again', async () => {
    const provider = new PiecesProvider({ only: 'fdd', cutOff: true });
    const { p } = await open(provider, 'fdd');
    await p.run('fdd');
    expect(await p.readDocument('fdd')).not.toContain('Half a re');
    expect(provider.calls.filter((c) => c.stage === 'fdd').map((c) => c.mode)).toEqual(['draft', 'gaps']);
    expect(await coverageCheck(p, 'fdd')).toBe('pass');
  });

  it("keeps requests below the chosen model's own limit", async () => {
    const provider = new PiecesProvider({ only: 'fdd' });
    const { p } = await open(provider, 'fdd');
    // No budget in project.yaml, but this model's limit is just above the whole request,
    // so 80% of it is not enough for one request and the FDD must be split.
    const whole = messageTokens((await p.promptFor('fdd')).messages);
    const limit = Math.ceil(whole * 1.1);
    Object.assign(provider, { contextLimit: async () => limit });
    await p.run('fdd');
    const calls = provider.calls.filter((c) => c.stage === 'fdd');
    // The full request no longer fits, so the tool sends compact pieces that carry only the rows they need.
    expect(calls.every((c) => c.mode === 'chunk')).toBe(true);
    expect(Math.max(...calls.map((c) => c.tokens))).toBeLessThanOrEqual(Math.floor(limit * 0.8));
    expect(await coverageCheck(p, 'fdd')).toBe('pass');
  });
});

describe('input budget', () => {
  it('cuts oversized input files at intake and warns the reviewer', async () => {
    const dir = await tempProject();
    // Leave room for the instructions but not for all of the input files.
    const probe = await Pipeline.open({ toolRoot: REPO_ROOT, projectDir: dir, provider: new PiecesProvider({ only: 'fdd' }) });
    const whole = messageTokens((await probe.promptFor('intake')).messages);
    await setBudget(dir, { maxInputTokens: whole - 300 });
    const p = await Pipeline.open({ toolRoot: REPO_ROOT, projectDir: dir, provider: new PiecesProvider({ only: 'fdd' }) });
    await p.run('intake');
    const checks = (await p.snapshot()).stages[0].checks;
    expect(checks.some((c) => c.level === 'warn' && /was too long/.test(c.message))).toBe(true);
  });

  it('refuses a step that cannot be split when it is over the limit', async () => {
    const dir = await tempProject();
    await setBudget(dir, { maxInputTokens: 700 });
    const p = await Pipeline.open({ toolRoot: REPO_ROOT, projectDir: dir, provider: new PiecesProvider({ only: 'fdd' }) });
    await expect(p.run('intake')).rejects.toThrow(/more than the 700 allowed/);
  });
});
