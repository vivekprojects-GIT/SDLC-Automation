import type { HostToUi, UiToHost } from './messages';

interface VsCodeApi {
  postMessage(message: unknown): void;
}
declare function acquireVsCodeApi(): VsCodeApi;

const api: VsCodeApi | undefined = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;

export function send(message: UiToHost): void {
  if (api) api.postMessage(message);
  else console.warn('No host to send to', message);
}

export function onHostMessage(handler: (message: HostToUi) => void): void {
  window.addEventListener('message', (e: MessageEvent) => {
    if (e.data && typeof e.data.type === 'string') handler(e.data as HostToUi);
  });
}
