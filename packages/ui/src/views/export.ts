import type { UiState } from '../state';
import { esc, when } from '../util';
import { STATUS_TEXT } from './rail';
import { lozenge, STATUS_TONE } from './icons';

const FORMAT = { word: 'Word', excel: 'Excel' } as const;

export function exportView(s: UiState): string {
  const snap = s.snapshot!;
  let h = `<header class="head"><div class="eyebrow">Final output</div><h1>Planview / PPP deliverables</h1>
    <p class="meta">Word and Excel copies of every approved deliverable, and the Requirements Traceability Matrix with its Transition to BAU plan, ready to submit for approval or storage, and the Jira import for the delivery team.</p></header>`;

  const rows = snap.stages
    .map(
      (st) =>
        `<tr><td>${esc(st.docTitle)}</td><td>${lozenge(STATUS_TEXT[st.status], STATUS_TONE[st.status])}</td><td>${st.version ? `<span class="rid">v${esc(st.version)}</span>` : '—'}</td><td>${esc(st.approvedBy ?? '')}${st.approvedAt ? `<span class="by">${esc(when(st.approvedAt))}</span>` : ''}</td><td>${FORMAT[st.exportAs]}</td></tr>`,
    )
    .join('');
  h += `<section class="card"><h3>Deliverables</h3><div class="tbl"><table class="deliverables"><thead><tr><th>Deliverable</th><th>Status</th><th>Version</th><th>Approved by</th><th>Format</th></tr></thead><tbody>${rows}
    <tr><td>Requirements Traceability Matrix with T2BAU plan</td><td>${lozenge(snap.exportReady ? 'Ready' : 'Waiting', snap.exportReady ? 'info' : 'neutral')}</td><td>—</td><td>Generated from the approved documents</td><td>Excel</td></tr>
    <tr><td>Jira import: epics, stories and sub-tasks</td><td>${lozenge(snap.exportReady ? 'Ready' : 'Waiting', snap.exportReady ? 'info' : 'neutral')}</td><td>—</td><td>Generated from the BRD, FDD and TDD</td><td>Excel and CSV</td></tr></tbody></table></div></section>`;

  if (!snap.exportReady) {
    const pending = snap.stages.filter((st) => st.status !== 'approved');
    return h + `<section class="card"><h3>Still waiting for approval</h3><ul class="plain">${pending.map((st) => `<li>${esc(st.title)}: ${STATUS_TEXT[st.status]} (${esc(st.owner)})</li>`).join('')}</ul></section>`;
  }

  const r = s.exportResult;
  const deliverables = snap.exportFiles.filter((f) => f.includes('/deliverables/'));
  h += `<section class="card cta"><p>${r ? `Exported ${r.files.length} files. ${r.coverage.fullyTraced} of ${r.coverage.requirements} requirements are fully traced.` : deliverables.length ? 'The deliverables already exist. Create them again to pick up any changes.' : 'Every deliverable is approved. Create the Planview/PPP files.'}</p>
    <button class="btn primary" data-act="export" ${s.pending ? 'disabled' : ''}>${deliverables.length ? 'Create the files again' : 'Create Planview/PPP files'}</button></section>`;

  if (deliverables.length) {
    h += `<section class="card"><h3>Files for Planview / PPP</h3><ul class="files">${deliverables.map((f) => `<li><button class="link fn" data-act="openFile" data-rel="${esc(f)}">${esc(f)}</button></li>`).join('')}</ul>
      <p class="hint">Word and Excel files open in Office. Each starts with document control: version, owner, and who approved it and when. The BRD, FDD and DSD workbooks have one tab per section. In rtm.xlsx, the Transition to BAU columns are for the BAU owner to complete. jira-import.csv loads into Jira through its CSV import; jira-import.xlsx is the same list to review, with the import steps.</p></section>`;
  }
  if (r) {
    const list = (ids: string[]) => (ids.length ? ids.map((i) => `<span class="rid">${esc(i)}</span>`).join(' ') : lozenge('None', 'bad'));
    const scope = (v: string) => (v ? lozenge(v === 'Yes' ? 'In scope' : 'Out of scope', v === 'Yes' ? 'good' : 'neutral') : lozenge('Not decided', 'bad'));
    const body = r.matrix
      .map((m) => (m.removed ? `<tr class="struck"><td><span class="rid">${esc(m.id)}</span></td><td colspan="6">Removed by the reviewer</td></tr>` : `<tr><td><span class="rid">${esc(m.id)}</span></td><td>${esc(m.type)}</td><td>${list(m.design)}</td><td>${m.data.length ? list(m.data) : '—'}</td><td>${list(m.technical)}</td><td>${scope(m.sit)}</td><td>${scope(m.uat)}</td></tr>`))
      .join('');
    h += `<section class="card"><h3>Requirements Traceability Matrix</h3><div class="tbl"><table><thead><tr><th>BRD ID</th><th>Type</th><th>FDD</th><th>Data attributes</th><th>TDD</th><th>SIT</th><th>UAT</th></tr></thead><tbody>${body}</tbody></table></div></section>`;
  }
  return h;
}
