import type { StageSnapshot } from '@sdlc/core';

// One small icon set, drawn as SVG so it looks the same in every theme and editor font.
// Shapes follow the usual product conventions: filled circle + tick = done, triangle = warning, circle + cross = blocked.
const svg = (body: string, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  passed: svg('<circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M4.9 8.3l2 2 4.2-4.5" fill="none" class="ink-s" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>', 'i-good'),
  warning: svg('<path d="M8 1.6l6.8 12.1H1.2z" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/><path d="M8 6v3.6" class="ink-s" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="11.6" r=".9" class="ink-f"/>', 'i-warn'),
  blocked: svg('<circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" class="ink-s" stroke-width="1.6" stroke-linecap="round"/>', 'i-bad'),
  pending: svg('<circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 4.6V8l2.3 1.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>', 'i-warn'),
  running: svg('<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="1.8"/><path d="M8 1.8a6.2 6.2 0 0 1 6.2 6.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>', 'i-run rot'),
  idle: svg('<circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.4"/>', 'i-idle'),
  stale: svg('<circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5.3 8a2.7 2.7 0 1 0 .8-1.9M5.2 4.9v1.6h1.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>', 'i-warn'),
};

/** The icon for a pipeline step's state. */
export function stageIcon(status: StageSnapshot['status']): string {
  switch (status) {
    case 'approved':
      return ICONS.passed;
    case 'review':
      return ICONS.pending;
    case 'running':
      return ICONS.running;
    case 'stale':
      return ICONS.stale;
    default:
      return ICONS.idle;
  }
}

/** A workflow status label, the way issue trackers show a ticket's state. */
export function lozenge(text: string, tone: 'good' | 'warn' | 'bad' | 'info' | 'neutral'): string {
  return `<span class="lozenge ${tone}">${text}</span>`;
}

export const STATUS_TONE: Record<StageSnapshot['status'], 'good' | 'warn' | 'bad' | 'info' | 'neutral'> = {
  approved: 'good',
  review: 'warn',
  running: 'info',
  stale: 'bad',
  ready: 'info',
  locked: 'neutral',
};
