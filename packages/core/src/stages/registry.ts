// The steps of MUFG's PDLC Planning phase, in their default order. Each step writes one deliverable
// and waits at its own review gate. Owners are defaults until MUFG confirms its approvers.
export const STAGE_KEYS = ['intake', 'brd', 'fdd', 'dsd', 'tdd', 'sit-strategy', 'uat-strategy'] as const;
export type StageKey = (typeof STAGE_KEYS)[number];

/** The kinds of numbered item a step writes in a table: functional design, data attributes, technical design. */
export type ItemPrefix = 'FD' | 'DA' | 'TD';

export interface StageDef {
  key: StageKey;
  /** Name of the step in the UI. */
  title: string;
  /** Name of the deliverable the step writes. */
  docTitle: string;
  docCode: string;
  /** File under content/agents/. */
  agent: string;
  agentTitle: string;
  defaultOwner: string;
  /** File under content/templates/<pack>/ and content/steps/. */
  file: string;
  /** Approved documents this step may read, when they come earlier in the stage order. */
  inputsFrom: StageKey[];
  readsRawInputs: boolean;
  readsFigma: boolean;
  /** Steps that write numbered items (FD-01, DA-01, TD-01…) traced back to requirements. */
  items?: ItemPrefix;
  /** How the deliverable is exported for Planview/PPP: a Word document, or an Excel workbook with one tab per section. */
  exportAs: 'word' | 'excel';
}

export const STAGES: Record<StageKey, StageDef> = {
  intake: {
    key: 'intake', title: 'Intake and gaps', docTitle: 'Intake summary', docCode: 'CTX',
    agent: 'business-analyst', agentTitle: 'Business analyst agent', defaultOwner: 'Project manager',
    file: 'intake.md', inputsFrom: [], readsRawInputs: true, readsFigma: true, exportAs: 'word',
  },
  brd: {
    key: 'brd', title: 'BRD', docTitle: 'Business Requirement Document', docCode: 'BRD',
    agent: 'business-analyst', agentTitle: 'Business analyst agent', defaultOwner: 'Business analyst',
    file: 'brd.md', inputsFrom: ['intake'], readsRawInputs: false, readsFigma: false, exportAs: 'excel',
  },
  fdd: {
    key: 'fdd', title: 'FDD', docTitle: 'Functional Design Document', docCode: 'FDD',
    agent: 'it-lead', agentTitle: 'IT lead agent', defaultOwner: 'IT lead',
    file: 'fdd.md', inputsFrom: ['intake', 'brd'], readsRawInputs: false, readsFigma: true, items: 'FD', exportAs: 'excel',
  },
  dsd: {
    key: 'dsd', title: 'DRD / DSD', docTitle: 'Data Sourcing Document (with Data Requirement Document)', docCode: 'DSD',
    agent: 'it-lead', agentTitle: 'IT lead agent', defaultOwner: 'IT lead',
    file: 'dsd.md', inputsFrom: ['brd', 'fdd'], readsRawInputs: true, readsFigma: false, items: 'DA', exportAs: 'excel',
  },
  tdd: {
    key: 'tdd', title: 'TDD', docTitle: 'Technical Design Document', docCode: 'TDD',
    agent: 'it-lead', agentTitle: 'IT lead agent', defaultOwner: 'IT lead',
    file: 'tdd.md', inputsFrom: ['brd', 'fdd', 'dsd'], readsRawInputs: false, readsFigma: false, items: 'TD', exportAs: 'word',
  },
  'sit-strategy': {
    key: 'sit-strategy', title: 'SIT QA Strategy', docTitle: 'SIT QA Strategy', docCode: 'SITS',
    agent: 'qa-lead', agentTitle: 'QA lead agent', defaultOwner: 'QA lead',
    file: 'sit-strategy.md', inputsFrom: ['brd', 'fdd', 'dsd', 'tdd'], readsRawInputs: false, readsFigma: false, exportAs: 'word',
  },
  'uat-strategy': {
    key: 'uat-strategy', title: 'UAT QA Strategy', docTitle: 'UAT QA Strategy', docCode: 'UATS',
    agent: 'uat-lead', agentTitle: 'UAT lead agent', defaultOwner: 'UAT lead',
    file: 'uat-strategy.md', inputsFrom: ['brd', 'fdd', 'sit-strategy'], readsRawInputs: false, readsFigma: false, exportAs: 'word',
  },
};

export function isStageKey(value: string): value is StageKey {
  return (STAGE_KEYS as readonly string[]).includes(value);
}
