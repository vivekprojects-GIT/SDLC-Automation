import type { Coverage, MatrixRow } from '../types';
import { toCsv } from '../util/csv';
import { cellFor, extractItems, type TraceItem } from './items';

export interface TraceDocs {
  brd?: string;
  scenarios?: string;
  testCases?: string;
  stories?: string;
}

const only = (md: string | undefined, prefix: string) => (md ? extractItems(md).filter((i) => i.prefix === prefix && !i.struck) : []);

/** A test case covers the FRs it names; if it names none, the FRs of its scenarios. */
export function testCaseRequirements(tc: TraceItem, scenarios: TraceItem[]): string[] {
  const direct = tc.refs.filter((r) => r.startsWith('FR-'));
  if (direct.length) return direct;
  return tc.refs.filter((r) => r.startsWith('TS-')).flatMap((ts) => scenarios.find((s) => s.id === ts)?.refs.filter((r) => r.startsWith('FR-')) ?? []);
}

/** One row per functional requirement: its source and the scenarios, test cases and stories that cover it. */
export function buildMatrix(docs: TraceDocs, removed: string[]): MatrixRow[] {
  const frs = only(docs.brd, 'FR');
  const ts = only(docs.scenarios, 'TS');
  const tc = only(docs.testCases, 'TC');
  const us = only(docs.stories, 'US');
  const seen = new Set<string>();
  return frs
    .filter((fr) => !seen.has(fr.id) && !!seen.add(fr.id))
    .map((fr) => ({
      id: fr.id,
      requirement: cellFor(fr, /requirement/i),
      source: cellFor(fr, /source/i),
      scenarios: ts.filter((t) => t.refs.includes(fr.id)).map((t) => t.id),
      testCases: tc.filter((c) => testCaseRequirements(c, ts).includes(fr.id)).map((c) => c.id),
      stories: us.filter((s) => s.refs.includes(fr.id)).map((s) => s.id),
      removed: removed.includes(fr.id),
    }));
}

export function coverageOf(rows: MatrixRow[]): Coverage {
  const active = rows.filter((r) => !r.removed);
  return {
    requirements: active.length,
    withScenario: active.filter((r) => r.scenarios.length).length,
    withTestCase: active.filter((r) => r.testCases.length).length,
    withStory: active.filter((r) => r.stories.length).length,
    fullyTraced: active.filter((r) => r.scenarios.length && r.testCases.length && r.stories.length).length,
    missing: {
      scenarios: active.filter((r) => !r.scenarios.length).map((r) => r.id),
      testCases: active.filter((r) => !r.testCases.length).map((r) => r.id),
      stories: active.filter((r) => !r.stories.length).map((r) => r.id),
    },
  };
}

export function matrixToMarkdown(rows: MatrixRow[], projectName: string, at: string): string {
  const list = (ids: string[]) => (ids.length ? ids.join(', ') : '**none**');
  const lines = rows.map((r) =>
    r.removed
      ? `| ~~${r.id}~~ | Removed by the reviewer | | | | |`
      : `| ${r.id} | ${r.requirement.replace(/\|/g, '\\|')} | ${r.source.replace(/\|/g, '\\|')} | ${list(r.scenarios)} | ${list(r.testCases)} | ${list(r.stories)} |`,
  );
  return [
    `# Traceability matrix: ${projectName}`,
    '',
    `Generated ${at}. Every functional requirement, its source, and the scenarios, test cases and stories that cover it.`,
    '',
    '| Requirement | Text | Source | Scenarios | Test cases | Stories |',
    '| --- | --- | --- | --- | --- | --- |',
    ...lines,
    '',
  ].join('\n');
}

export function matrixToCsv(rows: MatrixRow[]): string {
  return toCsv([
    ['Requirement', 'Text', 'Source', 'Scenarios', 'Test cases', 'Stories', 'Removed'],
    ...rows.map((r) => [r.id, r.requirement, r.source, r.scenarios.join(' '), r.testCases.join(' '), r.stories.join(' '), r.removed ? 'yes' : '']),
  ]);
}
