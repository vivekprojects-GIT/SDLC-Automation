import type { Coverage, MatrixRow } from '../types';
import { toCsv } from '../util/csv';
import { cellFor, extractItems, type TraceItem } from './items';

/** The approved documents the trace is built from. */
export interface TraceDocs {
  brd?: string;
  fdd?: string;
  dsd?: string;
  tdd?: string;
  sit?: string;
  uat?: string;
}

const only = (md: string | undefined, prefix: string) => (md ? extractItems(md).filter((i) => i.prefix === prefix && !i.struck) : []);

/** The requirements an item covers: the FRs it names, plus the FRs of the FD items it names. */
export function requirementsOf(item: TraceItem, design: TraceItem[]): string[] {
  const direct = item.refs.filter((r) => r.startsWith('FR-'));
  const viaDesign = item.refs.filter((r) => r.startsWith('FD-')).flatMap((fd) => design.find((d) => d.id === fd)?.refs.filter((r) => r.startsWith('FR-')) ?? []);
  return [...new Set([...direct, ...viaDesign])];
}

/** A QA strategy's decision for each requirement in its "Requirements in scope" table: Yes or No. */
export function scopeOf(strategy: string | undefined): Map<string, string> {
  const out = new Map<string, string>();
  for (const row of only(strategy, 'FR')) {
    const v = cellFor(row, /in .*scope|^scope$/i).replace(/[*_`]/g, '').trim().toLowerCase();
    out.set(row.id, v.startsWith('y') ? 'Yes' : v.startsWith('n') ? 'No' : '');
  }
  return out;
}

/** One row per requirement: its type and source, the design items, data attributes and technical design that realise it, and its SIT and UAT scope. */
export function buildMatrix(docs: TraceDocs, removed: string[]): MatrixRow[] {
  const frs = only(docs.brd, 'FR');
  const fd = only(docs.fdd, 'FD');
  const da = only(docs.dsd, 'DA');
  const td = only(docs.tdd, 'TD');
  const sit = scopeOf(docs.sit);
  const uat = scopeOf(docs.uat);
  const covering = (items: TraceItem[], fr: string) => items.filter((i) => requirementsOf(i, fd).includes(fr)).map((i) => i.id);
  const seen = new Set<string>();
  return frs
    .filter((fr) => !seen.has(fr.id) && !!seen.add(fr.id))
    .map((fr) => ({
      id: fr.id,
      requirement: cellFor(fr, /requirement/i),
      type: cellFor(fr, /^type$/i),
      source: cellFor(fr, /source/i),
      priority: cellFor(fr, /priority/i),
      design: fd.filter((d) => d.refs.includes(fr.id)).map((d) => d.id),
      data: covering(da, fr.id),
      technical: covering(td, fr.id),
      sit: sit.get(fr.id) ?? '',
      uat: uat.get(fr.id) ?? '',
      removed: removed.includes(fr.id),
    }));
}

/** Items of one kind (e.g. FD) that no item of another kind (e.g. TD) names. */
export function uncovered(source: string | undefined, prefix: string, target: string | undefined, targetPrefix: string, removed: string[] = []): string[] {
  const targets = only(target, targetPrefix);
  return only(source, prefix)
    .filter((s) => !removed.includes(s.id))
    .filter((s) => !targets.some((t) => t.refs.includes(s.id)))
    .map((s) => s.id);
}

const traced = (r: MatrixRow) => !!(r.design.length && r.technical.length && r.sit && r.uat);

export function coverageOf(rows: MatrixRow[]): Coverage {
  const active = rows.filter((r) => !r.removed);
  const without = (has: (r: MatrixRow) => boolean) => active.filter((r) => !has(r)).map((r) => r.id);
  return {
    requirements: active.length,
    withDesign: active.filter((r) => r.design.length).length,
    withData: active.filter((r) => r.data.length).length,
    withTechnical: active.filter((r) => r.technical.length).length,
    sitDecided: active.filter((r) => r.sit).length,
    uatDecided: active.filter((r) => r.uat).length,
    fullyTraced: active.filter(traced).length,
    missing: {
      design: without((r) => !!r.design.length),
      technical: without((r) => !!r.technical.length),
      sit: without((r) => !!r.sit),
      uat: without((r) => !!r.uat),
    },
  };
}

export const traceStatus = (r: MatrixRow) => (r.removed ? 'Removed' : traced(r) ? 'Complete' : 'Gaps');

/**
 * The Transition to BAU columns of the RTM. They are left for the BAU owner to complete:
 * nothing in the Planning documents says who will run the service after go-live.
 */
export const T2BAU_COLUMNS = ['BAU owner', 'Transition activity', 'BAU readiness check', 'Target date'] as const;

export function matrixToMarkdown(rows: MatrixRow[], projectName: string, at: string): string {
  const list = (ids: string[]) => (ids.length ? ids.join(', ') : '**none**');
  const cell = (s: string) => s.replace(/\|/g, '\\|');
  const lines = rows.map((r) =>
    r.removed
      ? `| ~~${r.id}~~ | Removed by the reviewer | | | | | | | | |`
      : `| ${r.id} | ${cell(r.requirement)} | ${cell(r.type)} | ${cell(r.source)} | ${list(r.design)} | ${r.data.join(', ') || '—'} | ${list(r.technical)} | ${r.sit || '**not decided**'} | ${r.uat || '**not decided**'} | ${traceStatus(r)} |`,
  );
  return [
    `# Requirements Traceability Matrix: ${projectName}`,
    '',
    `Generated ${at}. Every requirement in the BRD, traced to the functional design, the data attributes, the technical design and the SIT and UAT scope. The Transition to BAU plan columns are in rtm.xlsx, for the BAU owner to complete.`,
    '',
    '| BRD ID | Requirement | Type | Source | FDD | Data attributes | TDD | In SIT scope | In UAT scope | Trace |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...lines,
    '',
  ].join('\n');
}

export function matrixToCsv(rows: MatrixRow[]): string {
  return toCsv([
    ['BRD ID', 'Requirement', 'Type', 'Source', 'Priority', 'FDD', 'Data attributes', 'TDD', 'In SIT scope', 'In UAT scope', 'Trace status', ...T2BAU_COLUMNS],
    ...rows.map((r) => [r.id, r.requirement, r.type, r.source, r.priority, r.design.join(' '), r.data.join(' '), r.technical.join(' '), r.sit, r.uat, traceStatus(r), ...T2BAU_COLUMNS.map(() => '')]),
  ]);
}
