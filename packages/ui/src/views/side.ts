import type { StageKey } from '@sdlc/core';
import type { UiState } from '../state';
import { esc, time, when } from '../util';
import { lozenge, stageIcon, STATUS_TONE } from './icons';
import { STATUS_TEXT } from './rail';

const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
const bar = (value: number, full: boolean) => `<div class="bar" role="presentation"><i class="${full ? 'full' : ''}" data-width="${value}"></i></div>`;

export function side(s: UiState): string {
  const snap = s.snapshot;
  if (!snap) return '';
  const stages = snap.stages;
  const approved = stages.filter((st) => st.status === 'approved').length;
  const c = snap.coverage;
  const log = snap.audit.slice(0, 40);
  // The audit log stores step keys; show the step names people see in the pipeline list.
  const stageName = (key: string) => (key === 'export' ? '' : (stages.find((st) => st.key === key)?.title ?? key));

  // Approvals: overall progress, then each step with its owner and who signed it off.
  const steps = stages
    .map((st) => {
      const right =
        st.status === 'approved' && st.approvedBy
          ? `<span class="who">${esc(st.approvedBy.replace(/\s*\(.*\)$/, ''))}</span><span class="when">${esc(when(st.approvedAt))}</span>`
          : lozenge(STATUS_TEXT[st.status], STATUS_TONE[st.status]);
      return `<li>${stageIcon(st.status)}<div><span class="t">${esc(st.title)}</span><span class="o">${esc(st.owner)}</span></div><div class="r">${right}</div></li>`;
    })
    .join('');
  const approvalPct = pct(approved, stages.length);

  // Traceability: how many functional requirements each kind of document covers, and which ones it misses.
  const written = (key: StageKey) => stages.find((st) => st.key === key)?.hasDocument ?? false;
  const traceRow = (label: string, key: StageKey, n: number, missing: string[]) => {
    if (!written(key)) return `<div class="trace"><div class="trace-head"><span>${label}</span><span class="muted">Not written yet</span></div>${bar(0, false)}</div>`;
    const p = pct(n, c.requirements);
    const shown = missing.slice(0, 8).map((id) => `<span class="rid">${esc(id)}</span>`).join(' ');
    const more = missing.length > 8 ? ` <span class="muted">+${missing.length - 8} more</span>` : '';
    return `<div class="trace"><div class="trace-head"><span>${label}</span><span class="num"><b>${n}</b> / ${c.requirements}<span class="p">${p}%</span></span></div>${bar(p, p === 100)}
      ${missing.length ? `<p class="gap">Not covered: ${shown}${more}</p>` : ''}</div>`;
  };
  const tracedPct = pct(c.fullyTraced, c.requirements);
  const allWritten = written('test-scenarios') && written('test-cases') && written('stories');

  return `
    <section class="card"><div class="card-head"><h3>Approvals</h3><span class="num small"><b>${approved}</b> of ${stages.length} · ${approvalPct}%</span></div>
      ${bar(approvalPct, approvalPct === 100)}
      <ol class="stepper">${steps}</ol>
      <p class="small">Each step starts only after the one before it is approved.</p></section>
    <section class="card"><div class="card-head"><h3>Traceability</h3>${c.requirements ? `<span class="small">${c.requirements} functional requirements</span>` : ''}</div>
      ${
        c.requirements
          ? `<div class="kpi"><span class="kpi-n">${allWritten ? `${tracedPct}%` : '—'}</span><span class="kpi-l">${allWritten ? 'fully traced: each requirement has a scenario, a test case and a story' : 'fully traced, shown once scenarios, test cases and stories are all written'}</span></div>
        ${traceRow('Test scenarios', 'test-scenarios', c.withScenario, c.missing.scenarios)}${traceRow('Test cases', 'test-cases', c.withTestCase, c.missing.testCases)}${traceRow('Stories', 'stories', c.withStory, c.missing.stories)}`
          : '<p class="empty">Appears once the BRD lists requirements.</p>'
      }</section>
    <section class="card"><h3>Audit log</h3>${log.length ? `<ol class="log">${log.map((e) => `<li><time>${esc(time(e.at))}</time><span><b>${esc(e.actor)}</b> · ${esc(e.action)}${stageName(e.stage) ? ` ${esc(stageName(e.stage))}` : ''}${e.version ? ` v${esc(e.version)}` : ''}${e.detail ? `<em>${esc(e.detail)}</em>` : ''}</span></li>`).join('')}</ol>` : '<p class="empty">Every action, by people and by agents, is listed here.</p>'}
      <p class="small">Saved in outputs/audit-log.csv. Never sent to the AI.</p></section>`;
}
