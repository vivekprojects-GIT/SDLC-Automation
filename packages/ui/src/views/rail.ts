import type { StageSnapshot } from '@sdlc/core';
import type { UiState } from '../state';
import { esc } from '../util';
import { ICONS } from './icons';

export const STATUS_TEXT: Record<StageSnapshot['status'], string> = {
  locked: 'Waiting',
  ready: 'Ready to run',
  running: 'Writing…',
  review: 'Needs review',
  approved: 'Approved',
  stale: 'Out of date',
};

// Drawn arrows, because arrow characters render as specks in some editor fonts.
const ICON_IN = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M8 2v9M4 7l4 4 4-4M3 14h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_OUT = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M8 11V2M4 6l4-4 4 4M3 14h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function rail(s: UiState): string {
  const snap = s.snapshot;
  if (!snap) return '';
  const item = (view: string, n: string, name: string, sub: string, cls: string, disabled = false) =>
    `<button class="step ${cls} ${s.view === view ? 'on' : ''}" data-act="view" data-view="${esc(view)}" ${disabled ? 'disabled' : ''} ${s.view === view ? 'aria-current="step"' : ''}>
      <span class="n">${n}</span><span class="nm">${esc(name)}</span><span class="st">${esc(sub)}</span></button>`;
  const files = snap.inputs.length;
  const exported = snap.exportFiles.length > 0;
  const exportText = exported && snap.exportReady ? 'Exported' : exported ? 'Out of date' : snap.exportReady ? 'Ready to export' : 'After all approvals';
  return [
    '<h3>Pipeline</h3>',
    item('inputs', ICON_IN, 'Inputs', `${files} file${files === 1 ? '' : 's'}`, 's-place'),
    // Stepper convention: finished steps show a tick, the step at work shows a spinner, the rest show their number.
    ...snap.stages.map((st, i) => {
      const n = st.status === 'approved' ? ICONS.passed : st.status === 'running' ? ICONS.running : st.status === 'stale' ? ICONS.stale : String(i + 1);
      return item(st.key, n, st.title, `${STATUS_TEXT[st.status]} · ${st.owner}`, `s-${st.status}${n.startsWith('<svg') ? ' s-icon' : ''}`, st.status === 'locked' && !st.hasDocument);
    }),
    item('export', ICON_OUT, 'Export', exportText, `s-place${exported && snap.exportReady ? ' s-done' : ''}`, !snap.exportReady && !exported),
  ].join('');
}
