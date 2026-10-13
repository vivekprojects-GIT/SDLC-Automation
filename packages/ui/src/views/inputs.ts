import type { UiState } from '../state';
import { bytes, esc } from '../util';
import { lozenge } from './icons';

const TYPE_TEXT: Record<string, string> = { 'new-build': 'New build', migration: 'Migration', enhancement: 'Fix or enhance an existing app' };

export function inputsView(s: UiState): string {
  const snap = s.snapshot!;
  const docs = snap.inputs.filter((f) => f.kind === 'document');
  const figma = snap.inputs.filter((f) => f.kind === 'figma');
  const intake = snap.stages[0];
  const next = snap.stages.find((st) => st.status === 'ready' || st.status === 'stale' || st.status === 'running' || st.status === 'review');
  const list = (files: typeof snap.inputs, empty: string) =>
    files.length
      ? `<ul class="files">${files.map((f) => `<li><button class="link fn" data-act="openFile" data-rel="inputs/${esc(f.rel)}">${esc(f.rel)}</button><span class="fk">${bytes(f.bytes)}</span>${f.readable ? '' : `${lozenge(esc(f.note ?? 'Not read'), 'warn')}`}</li>`).join('')}</ul>`
      : `<p class="empty">${empty}</p>`;

  const cta =
    intake.status === 'ready'
      ? `<p>The pipeline writes each document from the template, runs its checks, then waits for the owner to approve it.${s.autoAdvance ? ' Approving one step starts the next.' : ''}</p>
         <button class="btn primary" data-act="run" data-stage="intake" ${docs.length && !snap.busy ? '' : 'disabled'}>Run pipeline</button>`
      : next
        ? `<p>The pipeline is under way. Next: <b>${esc(next.title)}</b> (${esc(next.owner)}).</p><button class="btn" data-act="view" data-view="${next.key}">Go to ${esc(next.title)}</button>`
        : `<p>Every document is approved.</p><button class="btn" data-act="view" data-view="export">Go to export</button>`;

  return `<header class="head"><div><div class="eyebrow">Project · ${esc(TYPE_TEXT[snap.project.type] ?? snap.project.type)}</div><h1>${esc(snap.project.name)}</h1>
      <p class="meta">Template pack: ${esc(snap.project.templatePack)} · Folder: projects/${esc(snap.project.id)}</p></div></header>
    <section class="card"><div class="card-head"><h3>Requirement inputs</h3><span class="row-actions"><button class="btn sm" data-act="addInputs">Add files</button><button class="btn sm" data-act="openInputs">Open inputs folder</button></span></div>
      ${list(docs, 'No files yet. Add requirement notes, meeting transcripts, existing documents or legacy exports.')}
      <p class="hint">Readable: .md, .txt, .csv, .docx, .xlsx. PDF is not supported yet.</p></section>
    <section class="card"><h3>Figma frames</h3>${list(figma, 'No Figma frames yet. Export frames as PNG, or as a short description in .md, into inputs/figma/.')}</section>
    <section class="card cta">${cta}</section>`;
}
