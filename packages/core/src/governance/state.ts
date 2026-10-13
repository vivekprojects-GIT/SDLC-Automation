import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { StageKey } from '../stages/registry';
import type { CheckResult, HistoryEntry, Resolution } from '../types';

export interface StageState {
  status?: 'review' | 'approved' | 'stale';
  version?: string;
  history: HistoryEntry[];
  answers: Record<string, string>;
  resolutions: Record<string, Resolution>;
  checks: CheckResult[];
  /** Warnings from generation, such as input files that were cut to fit the budget. */
  notes: string[];
  bodyHash?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface PipelineState {
  schema: 1;
  stages: Partial<Record<StageKey, StageState>>;
}

export const stateFile = (projectDir: string) => path.join(projectDir, 'outputs', 'pipeline-state.json');

export const emptyStage = (): StageState => ({ history: [], answers: {}, resolutions: {}, checks: [], notes: [] });

export async function loadState(projectDir: string): Promise<PipelineState> {
  try {
    const raw = JSON.parse(await fs.readFile(stateFile(projectDir), 'utf8')) as PipelineState;
    for (const s of Object.values(raw.stages ?? {})) {
      if (s) Object.assign(s, { ...emptyStage(), ...s });
    }
    return { schema: 1, stages: raw.stages ?? {} };
  } catch {
    return { schema: 1, stages: {} };
  }
}

export async function saveState(projectDir: string, state: PipelineState): Promise<void> {
  const file = stateFile(projectDir);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2) + '\n', 'utf8');
  await fs.rename(tmp, file);
}
