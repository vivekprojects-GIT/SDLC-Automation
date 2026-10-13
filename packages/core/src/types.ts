import type { StageKey } from './stages/registry';

/** What a person sees for a step. "ready" and "locked" are worked out, not stored. */
export type StageStatus = 'locked' | 'ready' | 'running' | 'review' | 'approved' | 'stale';

export type Resolution = 'keep' | 'remove' | 'waive';

export interface Actor {
  name: string;
}

export type HistoryAction = 'generated' | 'revised' | 'edited' | 'approved' | 'reopened' | 'marked stale';

export interface HistoryEntry {
  version: string;
  action: HistoryAction;
  by: string;
  at: string;
  note?: string;
}

export type CheckLevel = 'pass' | 'warn' | 'block';

export interface CheckResult {
  id: string;
  level: CheckLevel;
  message: string;
  /** Set when a reviewer can settle the check with a decision. */
  itemId?: string;
  options?: Resolution[];
  /** A send-back comment that would fix this check, for a one-click "ask the agent to fix it". */
  fix?: string;
}

export interface Question {
  id: string;
  question: string;
  foundIn: string;
  severity: string;
  suggested: string;
  answer: string;
}

export interface InputInfo {
  rel: string;
  kind: 'document' | 'figma';
  bytes: number;
  readable: boolean;
  note?: string;
}

export interface AuditEntry {
  at: string;
  stage: string;
  action: string;
  actor: string;
  version: string;
  detail: string;
}

export interface StageSnapshot {
  key: StageKey;
  title: string;
  docTitle: string;
  owner: string;
  agent: string;
  status: StageStatus;
  version?: string;
  file: string;
  hasDocument: boolean;
  checks: CheckResult[];
  canApprove: boolean;
  approvedBy?: string;
  approvedAt?: string;
  history: HistoryEntry[];
  questions?: Question[];
}

export interface MatrixRow {
  id: string;
  requirement: string;
  source: string;
  scenarios: string[];
  testCases: string[];
  stories: string[];
  removed: boolean;
}

export interface Coverage {
  requirements: number;
  withScenario: number;
  withTestCase: number;
  withStory: number;
  /** Requirements with a scenario, a test case and a story. */
  fullyTraced: number;
  /** Requirement IDs that each kind of document does not cover yet. */
  missing: { scenarios: string[]; testCases: string[]; stories: string[] };
}

export interface PipelineSnapshot {
  project: { id: string; name: string; type: string; dir: string; templatePack: string };
  provider: string;
  stages: StageSnapshot[];
  documents: Partial<Record<StageKey, string>>;
  inputs: InputInfo[];
  audit: AuditEntry[];
  coverage: Coverage;
  exportReady: boolean;
  exportFiles: string[];
  busy: boolean;
}

export interface ExportResult {
  files: string[];
  jiraCsv: string;
  matrix: MatrixRow[];
  counts: { epics: number; stories: number; subTasks: number };
}
