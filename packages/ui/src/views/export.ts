import type { UiState } from '../state';
import { esc } from '../util';
import { STATUS_TEXT } from './rail';
import { lozenge } from './icons';

export function exportView(s: UiState): string {
  const snap = s.snapshot!;
  let h = `<header class="head"><div><div class="eyebrow">Final output</div><h1>Export</h1>
    <p class="meta">A Jira import file and a traceability matrix, built from the approved documents.</p></div></header>`;

  if (!snap.exportReady) {
    const pending = snap.stages.filter((st) => st.status !== 'approved');
    return h + `<section class="card"><h3>Still waiting for approval</h3><ul class="plain">${pending.map((st) => `<li>${esc(st.title)}: ${STATUS_TEXT[st.status]} (${esc(st.owner)})</li>`).join('')}</ul></section>`;
  }

  const docs = snap.stages.map((st) => `<tr><td>${esc(st.docTitle)}</td><td><span class="rid">v${esc(st.version)}</span></td><td>${esc(st.approvedBy ?? '')}</td><td><button class="link" data-act="openFile" data-rel="${esc(st.file)}">${esc(st.file)}</button></td></tr>`).join('');
  h += `<section class="card"><h3>Approved documents</h3><div class="tbl"><table><thead><tr><th>Document</th><th>Version</th><th>Approved by</th><th>File</th></tr></thead><tbody>${docs}</tbody></table></div></section>`;

  const r = s.exportResult;
  h += `<section class="card cta"><p>${r ? `Exported ${r.counts.epics} epics, ${r.counts.stories} stories and ${r.counts.subTasks} sub-tasks.` : snap.exportFiles.length ? 'Export files already exist. Create them again to pick up any changes.' : 'Every document is approved. Create the export files.'}</p>
    <button class="btn primary" data-act="export" ${s.pending ? 'disabled' : ''}>${snap.exportFiles.length ? 'Create export files again' : 'Create export files'}</button></section>`;

  if (snap.exportFiles.length) {
    h += `<section class="card"><h3>Files</h3><ul class="files">${snap.exportFiles.map((f) => `<li><button class="link fn" data-act="openFile" data-rel="${esc(f)}">${esc(f)}</button></li>`).join('')}</ul>
      <p class="hint">Load jira-import.csv in Jira with System → External system import → CSV, and map Issue Id and Parent Id so stories sit under their epics.</p></section>`;
  }
  if (r) {
    h += `<section class="card"><div class="card-head"><h3>Jira import file</h3><button class="btn sm" data-act="copyCsv">Copy CSV</button></div><pre class="csv">${esc(r.jiraCsv)}</pre></section>`;
    const list = (ids: string[]) => (ids.length ? ids.map((i) => `<span class="rid">${esc(i)}</span>`).join(' ') : lozenge('None', 'bad'));
    const rows = r.matrix
      .map((m) => (m.removed ? `<tr class="struck"><td><span class="rid">${esc(m.id)}</span></td><td colspan="4">Removed by the reviewer</td></tr>` : `<tr><td><span class="rid">${esc(m.id)}</span></td><td>${esc(m.source)}</td><td>${list(m.scenarios)}</td><td>${list(m.testCases)}</td><td>${list(m.stories)}</td></tr>`))
      .join('');
    h += `<section class="card"><h3>Traceability matrix</h3><div class="tbl"><table><thead><tr><th>Requirement</th><th>Source</th><th>Scenarios</th><th>Test cases</th><th>Stories</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }
  return h;
}
