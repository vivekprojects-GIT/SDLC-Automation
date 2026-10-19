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
  /** How the deliverable is exported for Planview/PPP, and where. */
  exportAs: 'word' | 'excel';
  deliverable: string;
}

export interface MatrixRow {
  id: string;
  requirement: string;
  type: string;
  source: string;
  priority: string;
  /** Functional design items (FD) that realise the requirement. */
  design: string[];
  /** Data attributes (DA) in the DRD that serve it. */
  data: string[];
  /** Technical design items (TD) that build it. */
  technical: string[];
  /** Whether the SIT and UAT strategies put it in scope: Yes, No, or empty when not decided yet. */
  sit: string;
  uat: string;
  removed: boolean;
}

export interface Coverage {
  requirements: number;
  withDesign: number;
  withData: number;
  withTechnical: number;
  /** Requirements whose SIT (or UAT) scope is decided, in or out. */
  sitDecided: number;
  uatDecided: number;
  /** Requirements with a functional and technical design, and a SIT and UAT scope decision. */
  fullyTraced: number;
  /** Requirement IDs each document does not cover yet. */
  missing: { design: string[]; technical: string[]; sit: string[]; uat: string[] };
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
  /** The Planview/PPP-ready files, relative to the project folder. */
  files: string[];
  matrix: MatrixRow[];
  coverage: Coverage;
}
