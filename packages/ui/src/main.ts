import type { StageKey } from '@sdlc/core';
import { onHostMessage, send } from './host';
import type { HostToUi } from './messages';
import { state, type View } from './state';
import { esc } from './util';
import { exportView } from './views/export';
import { inputsView } from './views/inputs';
import { rail } from './views/rail';
import { side } from './views/side';
import { stageView } from './views/stage';

const app = document.getElementById('app')!;

const stageOf = (view: View) => state.snapshot?.stages.find((s) => s.key === view);

function topbar(): string {
  const projects =
    state.projects.length > 1
      ? `<label class="sr" for="project">Project</label><select id="project" data-act="project">${state.projects.map((p) => `<option value="${esc(p.id)}" ${p.id === state.selected ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>`
      : '';
  return `<div class="brand">SDLC CAPM<small>MUFG PDLC Planning deliverables, with a named owner approving each one</small></div>
    <div class="top-controls">${projects}<span class="kv"><span>AI</span>${esc(state.provider || 'Not connected')}</span>${modelPicker()}<span class="kv"><span>Reviewer</span>${esc(state.reviewer)}</span></div>`;
}

const k = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

function modelPicker(): string {
  const busy = !!state.snapshot?.busy;
  const known = state.model === '' || state.models.some((m) => m.id === state.model);
  const options = [
    `<option value="" ${state.model === '' ? 'selected' : ''}>Auto${state.autoModel ? ` (${/^auto$/i.test(state.autoModel) ? 'Copilot chooses' : esc(state.autoModel)})` : ''}</option>`,
    ...state.models.map((m) => {
      // Copilot can list two models with the same name; show the id to tell them apart.
      const twin = state.models.filter((x) => x.name === m.name).length > 1 ? ` · ${m.id}` : '';
      return `<option value="${esc(m.id)}" ${m.id === state.model ? 'selected' : ''}>${esc(m.name)} · ${k(m.maxInputTokens)} context${esc(twin)}${m.enabled ? '' : ' · not enabled'}</option>`;
    }),
    ...(known ? [] : [`<option value="${esc(state.model)}" selected>${esc(state.model)} (not available)</option>`]),
  ];
  const title = state.models.length ? 'The Copilot model that writes the documents. Auto picks the most capable one available.' : 'Copilot models appear here once Copilot is signed in and the folder is trusted.';
  return `<label class="model" title="${title}"><span>Model</span><select id="model" data-act="model" ${busy ? 'disabled' : ''}>${options.join('')}</select></label>`;
}

function main(): string {
  if (state.view === 'inputs') return inputsView(state);
  if (state.view === 'export') return exportView(state);
  const st = stageOf(state.view);
  return st ? stageView(state, st) : inputsView(state);
}

function render(): void {
  const active = document.activeElement as HTMLInputElement | null;
  const focusId = active?.id;
  const caret = active && 'selectionStart' in active ? active.selectionStart : null;

  if (!state.snapshot) {
    app.innerHTML = `<div class="top">${topbar()}</div>${banner()}<div class="loading">${state.projects.length || !state.reviewer ? 'Loading the project…' : 'No projects found. Copy projects/sample-commercial-loan to a new folder under projects/.'}</div>`;
    return;
  }
  app.innerHTML = `<div class="top">${topbar()}</div>${banner()}<div class="app"><nav class="rail" aria-label="Pipeline steps">${rail(state)}</nav><main class="main">${main()}</main><aside class="side" aria-label="Governance">${side(state)}</aside></div>`;
  // Bar widths are set here: the webview's content policy blocks inline style attributes.
  app.querySelectorAll<HTMLElement>('[data-width]').forEach((el) => (el.style.width = `${el.dataset.width}%`));

  if (focusId) {
    const el = document.getElementById(focusId) as HTMLInputElement | null;
    if (el) {
      el.focus();
      if (caret !== null) {
        try {
          el.setSelectionRange(caret, caret);
        } catch {
          /* not a text field */
        }
      }
    }
  }
}

function banner(): string {
  let h = '';
  if (state.error) {
    h += `<div class="banner error" role="alert"><div><b>${esc(state.error.message)}</b>${state.error.details?.length ? `<ul>${state.error.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}</div><button class="btn sm" data-act="dismiss">Dismiss</button></div>`;
  }
  if (state.notice) h += `<div class="banner notice" role="status">${esc(state.notice)}</div>`;
  return h;
}

/** Follows the pipeline: a step that starts running, else the first step waiting for review. */
function followPipeline(): void {
  const snap = state.snapshot!;
  const running = snap.stages.find((s) => s.status === 'running');
  if (running) {
    if (state.follow) state.view = running.key;
    return;
  }
  if (!state.follow) return;
  const review = snap.stages.find((s) => s.status === 'review');
  if (review) state.view = review.key;
  else if (snap.exportReady) state.view = 'export';
}

function onMessage(m: HostToUi): void {
  switch (m.type) {
    case 'session':
      Object.assign(state, { projects: m.projects, selected: m.selected, provider: m.provider, reviewer: m.reviewer, autoAdvance: m.autoAdvance, models: m.models, model: m.model, autoModel: m.autoModel });
      break;
    case 'state': {
      const before = state.snapshot;
      if (before && before.project.id !== m.snapshot.project.id) Object.assign(state, { view: 'inputs', follow: true, exportResult: undefined, progress: {} });
      state.snapshot = m.snapshot;
      state.pending = false;
      for (const st of m.snapshot.stages) {
        const wasRunning = before?.stages.find((x) => x.key === st.key)?.status === 'running';
        if (st.status === 'running' && !wasRunning && state.follow) state.view = st.key;
        if (st.status !== 'running' && wasRunning) delete state.progress[st.key];
        if (st.status !== 'review') {
          if (state.view === st.key) state.sendOpen = false;
        }
      }
      if (!m.snapshot.exportReady) state.exportResult = undefined;
      followPipeline();
      break;
    }
    case 'progress':
      (state.progress[m.stage] ??= []).push(m.message);
      if (state.view !== m.stage) return;
      break;
    case 'error':
      state.error = { message: m.message, details: m.details };
      state.pending = false;
      break;
    case 'exported':
      state.exportResult = m.result;
      state.view = 'export';
      break;
    case 'notice':
      state.notice = m.message;
      setTimeout(() => {
        state.notice = undefined;
        render();
      }, 3000);
      break;
  }
  render();
}

document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!el || (el as HTMLButtonElement).disabled) return;
  const act = el.dataset.act;
  const stage = state.view as StageKey;
  switch (act) {
    case 'view':
      Object.assign(state, { view: el.dataset.view as View, follow: false, sendOpen: false, confirmReopen: false });
      break;
    case 'run':
      Object.assign(state, { follow: true, pending: true, error: undefined });
      send({ type: 'run', stage: el.dataset.stage as StageKey | undefined });
      break;
    case 'approve':
      Object.assign(state, { follow: true, pending: true, error: undefined });
      send({ type: 'approve', stage });
      break;
    case 'sendOpen':
      Object.assign(state, { sendOpen: true, sendText: '' });
      render();
      document.getElementById('send-text')?.focus();
      return;
    case 'sendCancel':
      state.sendOpen = false;
      break;
    case 'sendGo':
      if (!state.sendText.trim()) return;
      Object.assign(state, { sendOpen: false, follow: true, pending: true, error: undefined });
      send({ type: 'sendBack', stage, comment: state.sendText.trim() });
      break;
    case 'fix':
      Object.assign(state, { sendOpen: false, follow: true, pending: true, error: undefined });
      send({ type: 'sendBack', stage, comment: el.dataset.comment! });
      break;
    case 'resolve':
      send({ type: 'resolve', stage, itemId: el.dataset.item!, decision: el.dataset.decision as 'keep' | 'remove' | 'waive' });
      return;
    case 'useSuggestion': {
      const q = stageOf('intake')?.questions?.find((x) => x.id === el.dataset.q);
      if (q) send({ type: 'answer', questionId: q.id, value: q.suggested });
      return;
    }
    case 'openDocument':
      send({ type: 'openDocument', stage });
      return;
    case 'openFile':
      send({ type: 'openFile', rel: el.dataset.rel! });
      return;
    case 'addInputs':
      send({ type: 'addInputs' });
      return;
    case 'openInputs':
      send({ type: 'openInputs' });
      return;
    case 'reopen':
      state.confirmReopen = true;
      break;
    case 'reopenCancel':
      state.confirmReopen = false;
      break;
    case 'reopenGo':
      Object.assign(state, { confirmReopen: false, follow: false });
      send({ type: 'reopen', stage });
      return;
    case 'export':
      state.pending = true;
      send({ type: 'export' });
      break;
    case 'dismiss':
      state.error = undefined;
      break;
    default:
      return;
  }
  render();
});

document.addEventListener('change', (e) => {
  const el = e.target as HTMLInputElement | HTMLSelectElement;
  if (el.dataset.act === 'project') send({ type: 'selectProject', id: el.value });
  if (el.dataset.act === 'model') {
    state.model = el.value;
    send({ type: 'selectModel', id: el.value });
  }
  const qid = (el as HTMLInputElement).dataset.answer;
  if (qid) send({ type: 'answer', questionId: qid, value: el.value });
});

document.addEventListener('input', (e) => {
  const el = e.target as HTMLTextAreaElement;
  if (el.dataset.act !== 'sendText') return;
  state.sendText = el.value;
  const go = document.querySelector<HTMLButtonElement>('[data-act="sendGo"]');
  if (go) go.disabled = !el.value.trim();
});

document.addEventListener('keydown', (e) => {
  const el = e.target as HTMLInputElement;
  if (e.key === 'Enter' && el.dataset.answer) el.blur();
});

onHostMessage(onMessage);
render();
send({ type: 'ready' });
