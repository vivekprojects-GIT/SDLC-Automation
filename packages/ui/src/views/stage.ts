import type { CheckResult, StageSnapshot } from '@sdlc/core';
import type { UiState } from '../state';
import { esc, renderMarkdown, when } from '../util';
import { STATUS_TEXT } from './rail';
import { ICONS, lozenge, STATUS_TONE } from './icons';

const MARK: Record<CheckResult['level'], string> = { pass: ICONS.passed, warn: ICONS.warning, block: ICONS.blocked };
const OPTION_TEXT = { keep: 'Keep it, confirmed with the business', remove: 'Remove it', waive: 'Waive, does not apply' } as const;

function checksCard(st: StageSnapshot): string {
  if (!st.checks.length) return '';
  const count = (level: CheckResult['level']) => st.checks.filter((c) => c.level === level).length;
  const blocks = count('block');
  // A build-style summary: how many passed, how many need a look, how many stop approval.
  const tally = (icon: string, n: number, label: string) => `<span class="${n ? '' : 'zero'}">${icon}<b>${n}</b> ${label}</span>`;
  const summary = `<div class="tally">${tally(ICONS.passed, count('pass'), 'passed')}${tally(ICONS.warning, count('warn'), count('warn') === 1 ? 'warning' : 'warnings')}${tally(ICONS.blocked, blocks, 'blocking')}</div>`;
  const items = st.checks
    .map((c) => {
      const ask = c.fix ? `<button class="btn sm" data-act="fix" data-comment="${esc(c.fix)}" title="Sends back with: ${esc(c.fix)}">Ask the agent to fix this</button>` : '';
      const decide = c.options && c.itemId ? c.options.map((o) => `<button class="btn sm" data-act="resolve" data-item="${esc(c.itemId)}" data-decision="${o}">${OPTION_TEXT[o]}</button>`).join('') : '';
      const fix = st.status === 'review' && (ask || decide) ? `<div class="fix">${ask}${decide}</div>` : '';
      return `<li class="${c.level}"><span class="mark" aria-label="${c.level}">${MARK[c.level]}</span><div>${esc(c.message)}${fix}</div></li>`;
    })
    .join('');
  return `<section class="card"><div class="card-head"><h3>Guardrail checks</h3>${summary}</div><ul class="checks">${items}</ul></section>`;
}

function questionsCard(st: StageSnapshot): string {
  const qs = st.questions ?? [];
  if (!qs.length) return '';
  const locked = st.status !== 'review';
  return `<section class="card"><h3>Open questions</h3><p class="hint">Answer critical questions before approving. Answers are written into the intake summary and used by every later step.</p>
    <div class="qs">${qs
      .map(
        (q) => `<div class="q"><div class="q-head"><span class="rid">${esc(q.id)}</span><span class="sev ${/critical/i.test(q.severity) ? 'crit' : ''}">${esc(q.severity)}</span><span class="fk">${esc(q.foundIn)}</span></div>
        <p>${esc(q.question)}</p>
        ${q.suggested ? `<p class="sug">Suggested: ${esc(q.suggested)} ${locked || q.answer || /^not (stated|given|found)/i.test(q.suggested) ? '' : `<button class="btn sm" data-act="useSuggestion" data-q="${esc(q.id)}">Use suggestion</button>`}</p>` : ''}
        <label for="ans-${esc(q.id)}">Answer</label><input id="ans-${esc(q.id)}" data-answer="${esc(q.id)}" value="${esc(q.answer)}" ${locked ? 'disabled' : ''} placeholder="Type the answer, then press Enter"></div>`,
      )
      .join('')}</div></section>`;
}

function historyCard(st: StageSnapshot): string {
  if (!st.history.length) return '';
  const rows = [...st.history].reverse().map((h) => `<tr><td><span class="rid">v${esc(h.version)}</span></td><td>${esc(h.action)}</td><td>${esc(h.by)}</td><td>${esc(when(h.at))}</td><td>${esc(h.note ?? '')}</td></tr>`).join('');
  return `<details class="card history"><summary><h3>Change history · ${st.history.length} entries</h3></summary><div class="tbl"><table><tbody>${rows}</tbody></table></div></details>`;
}

function actionBar(s: UiState, st: StageSnapshot): string {
  if (st.status === 'review') {
    if (s.sendOpen) {
      return `<div class="actions"><label class="who" for="send-text">What should change? The agent revises the document and it comes back to you for review.</label>
        <textarea id="send-text" data-act="sendText" rows="3">${esc(s.sendText)}</textarea>
        <span class="btns"><button class="btn" data-act="sendCancel">Cancel</button><button class="btn primary" data-act="sendGo" ${s.sendText.trim() && !s.pending ? '' : 'disabled'}>Send back</button></span></div>`;
    }
    return `<div class="actions"><span class="who">${st.canApprove ? `Reviewing as ${esc(s.reviewer)} for the ${esc(st.owner)}.` : 'Fix or decide the blocking checks before approving.'}</span>
      <span class="btns"><button class="btn" data-act="openDocument" title="Open the Markdown file to edit it; saving re-runs the checks">Edit file</button>
      <button class="btn" data-act="sendOpen" ${s.pending ? 'disabled' : ''} title="Send the draft back to the agent with a comment">Send back</button>
      <button class="btn primary" data-act="approve" ${st.canApprove && !s.pending ? '' : 'disabled'}>Approve as ${esc(st.owner)}</button></span></div>`;
  }
  if (st.status === 'approved') {
    if (s.confirmReopen) {
      return `<div class="actions"><span class="who">Reopening lets you change this document. Every later step becomes out of date and must be approved again.</span>
        <span class="btns"><button class="btn" data-act="reopenCancel">Cancel</button><button class="btn primary" data-act="reopenGo">Reopen</button></span></div>`;
    }
    return `<div class="actions"><span class="who">Approved by ${esc(st.approvedBy)} · ${esc(when(st.approvedAt))}</span>
      <span class="btns"><button class="btn" data-act="openDocument">Open file</button><button class="btn" data-act="reopen">Reopen for changes</button></span></div>`;
  }
  return '';
}

export function stageView(s: UiState, st: StageSnapshot): string {
  const snap = s.snapshot!;
  const index = snap.stages.findIndex((x) => x.key === st.key);
  const prev = snap.stages[index - 1];
  // Record header: the title, then the fields a reviewer scans first, the way an issue tracker lays out a ticket.
  const field = (label: string, value: string) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
  let h = `<header class="head"><div class="eyebrow">Step ${index + 1} of ${snap.stages.length}</div><h1>${esc(st.title)}</h1>
    <dl class="fields">${field('Status', lozenge(STATUS_TEXT[st.status], STATUS_TONE[st.status]))}${field('Version', st.version ? esc(st.version) : '—')}${field('Owner', esc(st.owner))}${field('Written by', esc(st.agent))}${st.approvedBy && st.status === 'approved' ? field('Approved', `${esc(st.approvedBy.replace(/\s*\(.*\)$/, ''))}, ${esc(when(st.approvedAt))}`) : ''}</dl></header>`;

  if (st.status === 'running') {
    const lines = s.progress[st.key] ?? [];
    return (
      h +
      `<section class="card"><h3>${esc(st.agent)} is working</h3><ul class="activity">${(lines.length ? lines : ['Starting']).map((l, i, all) => `<li class="${i === all.length - 1 ? 'now' : ''}">${i === all.length - 1 ? ICONS.running : ICONS.passed}${esc(l)}</li>`).join('')}</ul>
      <p class="hint">With Copilot this can take a minute. You can look at other steps meanwhile.</p></section>`
    );
  }
  if (st.status === 'locked') return h + `<section class="card"><p>This step starts after <b>${esc(prev?.title ?? 'the previous step')}</b> is approved.</p></section>`;
  if (st.status === 'ready' || st.status === 'stale') {
    const text = st.status === 'stale' ? 'An earlier document was reopened, so this one is out of date. Write a fresh draft once the earlier steps are approved again.' : 'Ready to write the first draft.';
    const blocked = snap.stages.slice(0, index).some((x) => x.status !== 'approved');
    h += `<section class="card cta"><p>${text}</p><button class="btn primary" data-act="run" data-stage="${st.key}" ${blocked || snap.busy ? 'disabled' : ''}>${st.status === 'stale' ? 'Write a fresh draft' : 'Run this step'}</button></section>`;
    if (!st.hasDocument) return h;
  }

  const doc = snap.documents[st.key];
  h += checksCard(st) + (st.key === 'intake' ? questionsCard(st) : '');
  if (doc !== undefined) {
    h += `<article class="paper"><div class="doc-top"><div class="doc-meta"><span><b>File</b> <button class="link" data-act="openDocument">${esc(st.file)}</button></span><span>${st.status === 'approved' ? 'Approved copy' : 'Draft for review'}</span></div></div>
      <div class="doc-body">${renderMarkdown(doc)}</div></article>`;
  }
  return h + historyCard(st) + actionBar(s, st);
}
