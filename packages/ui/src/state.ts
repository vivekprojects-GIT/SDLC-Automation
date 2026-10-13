import type { ExportResult, PipelineSnapshot, StageKey } from '@sdlc/core';
import type { ModelOption, ProjectRef } from './messages';

export type View = 'inputs' | 'export' | StageKey;

export interface UiState {
  projects: ProjectRef[];
  selected?: string;
  provider: string;
  reviewer: string;
  autoAdvance: boolean;
  models: ModelOption[];
  model: string;
  autoModel?: string;
  snapshot?: PipelineSnapshot;
  view: View;
  /** True until the person picks a view themselves; then the screen stops following the pipeline. */
  follow: boolean;
  progress: Partial<Record<StageKey, string[]>>;
  sendOpen: boolean;
  sendText: string;
  confirmReopen: boolean;
  error?: { message: string; details?: string[] };
  notice?: string;
  exportResult?: ExportResult;
  pending: boolean;
}

export const state: UiState = {
  projects: [],
  provider: '',
  reviewer: '',
  autoAdvance: true,
  models: [],
  model: '',
  view: 'inputs',
  follow: true,
  progress: {},
  sendOpen: false,
  sendText: '',
  confirmReopen: false,
  pending: false,
};
