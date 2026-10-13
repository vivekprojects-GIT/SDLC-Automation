// The only contract between the screens and whatever hosts them (today: the VS Code extension).
import type { ExportResult, PipelineSnapshot, Resolution, StageKey } from '@sdlc/core';

export type UiToHost =
  | { type: 'ready' }
  | { type: 'selectProject'; id: string }
  | { type: 'selectModel'; id: string }
  | { type: 'run'; stage?: StageKey }
  | { type: 'approve'; stage: StageKey }
  | { type: 'sendBack'; stage: StageKey; comment: string }
  | { type: 'answer'; questionId: string; value: string }
  | { type: 'resolve'; stage: StageKey; itemId: string; decision: Resolution }
  | { type: 'reopen'; stage: StageKey }
  | { type: 'openDocument'; stage: StageKey }
  | { type: 'openFile'; rel: string }
  | { type: 'addInputs' }
  | { type: 'openInputs' }
  | { type: 'export' }
  | { type: 'copy'; text: string };

export interface ProjectRef {
  id: string;
  name: string;
}

export interface ModelOption {
  id: string;
  name: string;
  family: string;
  maxInputTokens: number;
  /** False once Copilot has rejected the model for this account. */
  enabled: boolean;
}

export type HostToUi =
  | {
      type: 'session';
      projects: ProjectRef[];
      selected?: string;
      provider: string;
      reviewer: string;
      autoAdvance: boolean;
      /** Models the user can pick; empty when Copilot is unavailable (not signed in, or the folder is not trusted). */
      models: ModelOption[];
      /** A model id, or empty for Auto. */
      model: string;
      /** The model Auto would use right now. */
      autoModel?: string;
    }
  | { type: 'state'; snapshot: PipelineSnapshot }
  | { type: 'progress'; stage: StageKey; message: string }
  | { type: 'error'; message: string; details?: string[] }
  | { type: 'exported'; result: ExportResult }
  | { type: 'notice'; message: string };
