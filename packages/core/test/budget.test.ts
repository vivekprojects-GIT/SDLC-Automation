import { promises as fs } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { Pipeline, messageTokens, type LlmMessage, type LlmProvider } from '@sdlc/core';
import { FAKE_FIXTURES } from './support/sample-outputs';
import { REPO_ROOT, reviewer, tempProject } from './helpers';

const ALL = ['FR-01', 'FR-02', 'FR-03', 'FR-04', 'FR-05', 'FR-06', 'FR-07', 'FR-08'];
const pad = (n: number) => String(n).padStart(2, '0');
const list = (text: string | undefined) => (text ? text.split(/,\s*/).map((s) => s.trim()) : []);

/**
 * A stand-in AI that writes test cases and stories only for what each request asks for, so the
 * tests can see how a document is split, joined and gap-filled. Other steps get the sample outputs.
 */
class PiecesProvider implements LlmProvider {
  readonly name = 'Pieces test AI';
  calls: { stage: string; mode: string; user: string; tokens: number }[] = [];
  constructor(private readonly opts: { drop?: string[]; cutOff?: boolean } = {}) {}

  async complete(messages: LlmMessage[]): Promise<string> {
    const stage = messages[0].content.match(/^STAGE:\s*(\S+)/m)![1];
    const mode = messages[0].content.match(/^MODE:\s*(\S+)/m)![1];
    const user = messages[1].content;
    this.calls.push({ stage, mode, user, tokens: messageTokens(messages) });
    const first = this.calls.filter((c) => c.stage === stage).length === 1;
    if (stage === 'test-cases') return this.testCases(user, mode, first);
    if (stage === 'stories') return this.stories(user, mode);
    return FAKE_FIXTURES[stage as keyof typeof FAKE_FIXTURES];
  }

  private testCases(user: string, mode: string, first: boolean): string {
    let frs = mode === 'gaps' ? list(user.match(/still have no test case: ([^.]+)\./)?.[1]) : mode === 'chunk' ? list(user.match(/They cover: ([^.]+)\./)?.[1]) : ALL;
    if (first && this.opts.drop) frs = frs.filter((f) => !this.opts.drop!.includes(f));
    let n = Number(user.match(/starting at TC-(\d+)/)?.[1] ?? 1);
    const rows = frs.map((fr) => `| TC-${pad(n++)} | Positive | TS-01 | 1. Run | data | ok | ${fr} |`);
    if (first && this.opts.cutOff) rows.splice(rows.length - 1, 1, `| TC-${pad(n - 1)} | Negative | TS-02 | 1. Submit the appl`);
    return `# Test cases\n\n## Summary\nSome cases.\n\n## Test cases\n| ID | Type | Scenario | Steps | Test data | Expected result | Covers |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n`;
  }

  private stories(user: string, mode: string): string {
    if (mode === 'epic-plan') return '## EP-01 Policy checks\nCovers: FR-01, FR-02, FR-03, FR-04\n\n## EP-02 Exceptions\nCovers: FR-05, FR-06\n\n## EP-03 Records and history\nCovers: FR-07, FR-08\n';
    let n = Number(user.match(/starting at US-(\d+)/)?.[1] ?? 1);
    const story = (fr: string) =>
      `### US-${pad(n++)} Story for ${fr}\nAs a user, I want ${fr} delivered, so that the loan meets policy.\nCovers: ${fr}\nFigma: —\nPoints: 3\n\n**Acceptance criteria**\n- Given an application, when it is submitted, then ${fr} is met.\n\n**Sub-tasks**\n- Build it\n`;
    const epics =
      mode === 'chunk'
        ? [...user.matchAll(/^- (EP-\d+) (.+?) \(covers ([^)]+)\)$/gm)].map((m) => ({ id: m[1], name: m[2], covers: list(m[3]) }))
        : [{ id: 'EP-01', name: 'Everything', covers: ALL }];
    return `# Epics and user stories\n\n## Summary\nSome stories.\n\n${epics.map((e) => `## ${e.id} ${e.name}\nGoal.\n\n${e.covers.map(story).join('\n')}`).join('\n')}`;
  }
}

/** Replaces the project's budget block. */
async function setBudget(dir: string, budget: Record<string, number>) {
  const file = path.join(dir, 'project.yaml');
  const yaml = await fs.readFile(file, 'utf8');
  const block = `budget:\n${Object.entries(budget).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n`;
  await fs.writeFile(file, yaml.replace(/budget:[\s\S]*$/, block));
}

async function throughScenarios(p: Pipeline) {
  await p.run('intake');
  await p.answer('Q1', '$5M', reviewer);
  await p.answer('Q2', '7 years', reviewer);
  await p.answer('Q3', 'WCAG 2.1 AA', reviewer);
  await p.approve('intake', reviewer);
  await p.run('prd');
  await p.approve('prd', reviewer);
  await p.run('brd');
  await p.resolve('brd', 'FR-06', 'keep', reviewer);
  await p.approve('brd', reviewer);
  await p.run('test-scenarios');
  await p.approve('test-scenarios', reviewer);
}

async function open(provider: LlmProvider, budget?: Record<string, number>) {
  const dir = await tempProject();
  const p = await Pipeline.open({ toolRoot: REPO_ROOT, projectDir: dir, provider });
  await throughScenarios(p);
  if (budget) {
    await setBudget(dir, budget);
    await p.reload();
  }
  return { p, dir };
}

const checksOf = async (p: Pipeline, key: 'test-cases' | 'stories') => (await p.snapshot()).stages.find((s) => s.key === key)!;

describe('long documents', () => {
  it('writes test cases one group of scenarios at a time, then joins them', async () => {
    const provider = new PiecesProvider();
    // 8 scenarios at about 450 tokens each would not fit one 1,000-token reply: 2 scenarios per piece.
    const { p } = await open(provider, { maxOutputTokens: 1000 });
    await p.run('test-cases');
    const pieces = provider.calls.filter((c) => c.stage === 'test-cases' && c.mode === 'chunk');
    expect(pieces).toHaveLength(4);
    expect(pieces[0].user).toContain('Write test cases only for these scenarios: TS-01, TS-02.');
    const doc = (await p.readDocument('test-cases'))!;
    const ids = doc.match(/^\| TC-\d+/gm)!;
    expect(new Set(ids).size).toBe(ids.length);
    expect(doc).toMatch(new RegExp(`## Summary\\n${ids.length} test cases: ${ids.length} positive, 0 negative, 0 edge\\.`));
    const st = await checksOf(p, 'test-cases');
    expect(st.checks.find((c) => c.id === 'coverage')?.level).toBe('pass');
    expect(st.history.at(-1)?.note).toContain('written in 4 pieces');
  });

  it('plans the epics first, then writes the stories a few epics at a time', async () => {
    const provider = new PiecesProvider();
    const { p } = await open(provider, { maxOutputTokens: 1500 });
    await p.run('test-cases');
    await p.approve('test-cases', reviewer);
    await p.run('stories');
    const calls = provider.calls.filter((c) => c.stage === 'stories');
    expect(calls.map((c) => c.mode)).toEqual(['epic-plan', 'chunk', 'chunk']);
    expect(calls[2].user).toContain('- EP-02 Exceptions (covers FR-05, FR-06)');
    const doc = (await p.readDocument('stories'))!;
    expect(doc.match(/^## EP-\d+/gm)).toEqual(['## EP-01', '## EP-02', '## EP-03']);
    expect(doc).toContain('3 epics, 8 stories, 24 story points.');
    const st = await checksOf(p, 'stories');
    expect(st.checks.filter((c) => c.level === 'block')).toEqual([]);
  });

  it('writes missing items automatically before the reviewer sees the draft', async () => {
    const provider = new PiecesProvider({ drop: ['FR-07', 'FR-08'] });
    const { p, dir } = await open(provider);
    await p.run('test-cases');
    const calls = provider.calls.filter((c) => c.stage === 'test-cases');
    expect(calls.map((c) => c.mode)).toEqual(['draft', 'gaps']);
    expect(calls[1].user).toContain('These requirements still have no test case: FR-07, FR-08.');
    expect(calls[1].user).toContain('starting at TC-07');
    const st = await checksOf(p, 'test-cases');
    expect(st.checks.find((c) => c.id === 'coverage')?.level).toBe('pass');
    expect(st.history.at(-1)?.note).toContain('missing items written automatically for FR-07, FR-08');
    expect(await fs.readFile(path.join(dir, 'outputs', 'audit-log.csv'), 'utf8')).toContain('missing items written automatically for FR-07, FR-08');
  });

  it('drops a row the reply stopped in the middle of, and writes that item again', async () => {
    const provider = new PiecesProvider({ cutOff: true });
    const { p } = await open(provider);
    await p.run('test-cases');
    const doc = (await p.readDocument('test-cases'))!;
    expect(doc).not.toContain('1. Submit the appl');
    expect(provider.calls.filter((c) => c.stage === 'test-cases').map((c) => c.mode)).toEqual(['draft', 'gaps']);
    expect((await checksOf(p, 'test-cases')).checks.find((c) => c.id === 'coverage')?.level).toBe('pass');
  });

  it("keeps requests below the chosen model's own limit", async () => {
    const provider = new PiecesProvider();
    const { p } = await open(provider);
    // No budget in project.yaml, but this model's limit is just above the whole request,
    // so 80% of it is not enough for one request and the test cases must be split.
    const whole = messageTokens((await p.promptFor('test-cases')).messages);
    const limit = Math.ceil(whole * 1.1);
    Object.assign(provider, { contextLimit: async () => limit });
    await p.run('test-cases');
    const calls = provider.calls.filter((c) => c.stage === 'test-cases');
    // The full request no longer fits, so the tool sends compact pieces that carry only the rows they need.
    expect(calls.every((c) => c.mode === 'chunk')).toBe(true);
    expect(Math.max(...calls.map((c) => c.tokens))).toBeLessThanOrEqual(Math.floor(limit * 0.8));
    expect((await checksOf(p, 'test-cases')).checks.find((c) => c.id === 'coverage')?.level).toBe('pass');
  });
});

describe('input budget', () => {
  it('cuts oversized input files at intake and warns the reviewer', async () => {
    const dir = await tempProject();
    // Leave room for the instructions but not for all of the input files.
    const probe = await Pipeline.open({ toolRoot: REPO_ROOT, projectDir: dir, provider: new PiecesProvider() });
    const whole = messageTokens((await probe.promptFor('intake')).messages);
    await setBudget(dir, { maxInputTokens: whole - 300 });
    const p = await Pipeline.open({ toolRoot: REPO_ROOT, projectDir: dir, provider: new PiecesProvider() });
    await p.run('intake');
    const checks = (await p.snapshot()).stages[0].checks;
    expect(checks.some((c) => c.level === 'warn' && /was too long/.test(c.message))).toBe(true);
  });

  it('refuses a step that cannot be split when it is over the limit', async () => {
    const dir = await tempProject();
    await setBudget(dir, { maxInputTokens: 700 });
    const p = await Pipeline.open({ toolRoot: REPO_ROOT, projectDir: dir, provider: new PiecesProvider() });
    await expect(p.run('intake')).rejects.toThrow(/more than the 700 allowed/);
  });
});
