export const STAGE_KEYS = ['intake', 'prd', 'brd', 'test-scenarios', 'test-cases', 'stories'] as const;
export type StageKey = (typeof STAGE_KEYS)[number];

export interface StageDef {
  key: StageKey;
  /** Name of the step in the UI. */
  title: string;
  /** Name of the document the step writes. */
  docTitle: string;
  docCode: string;
  /** File under content/agents/. */
  agent: string;
  agentTitle: string;
  defaultOwner: string;
  /** File under content/templates/<pack>/ and content/stages/. */
  file: string;
  /** Approved documents this step may read, when they come earlier in the stage order. */
  inputsFrom: StageKey[];
  readsRawInputs: boolean;
  readsFigma: boolean;
  /** Steps whose output can be written in pieces, numbered with this prefix. */
  chunkPrefix?: 'TC' | 'US';
}

export const STAGES: Record<StageKey, StageDef> = {
  intake: {
    key: 'intake', title: 'Intake and gaps', docTitle: 'Intake summary', docCode: 'CTX',
    agent: 'business-analyst', agentTitle: 'Business analyst agent', defaultOwner: 'Project manager',
    file: 'intake.md', inputsFrom: [], readsRawInputs: true, readsFigma: true,
  },
  prd: {
    key: 'prd', title: 'PRD', docTitle: 'Product Requirements Document', docCode: 'PRD',
    agent: 'product-manager', agentTitle: 'Product manager agent', defaultOwner: 'Product owner',
    file: 'prd.md', inputsFrom: ['intake', 'brd'], readsRawInputs: false, readsFigma: false,
  },
  brd: {
    key: 'brd', title: 'BRD', docTitle: 'Business Requirements Document', docCode: 'BRD',
    agent: 'business-analyst', agentTitle: 'Business analyst agent', defaultOwner: 'Business analyst',
    file: 'brd.md', inputsFrom: ['intake', 'prd'], readsRawInputs: false, readsFigma: false,
  },
  'test-scenarios': {
    key: 'test-scenarios', title: 'Test scenarios', docTitle: 'Test scenarios', docCode: 'TS',
    agent: 'qa-lead', agentTitle: 'QA lead agent', defaultOwner: 'QA lead',
    file: 'test-scenarios.md', inputsFrom: ['intake', 'brd'], readsRawInputs: false, readsFigma: true,
  },
  'test-cases': {
    key: 'test-cases', title: 'Test cases', docTitle: 'Test cases', docCode: 'TC',
    agent: 'qa-lead', agentTitle: 'QA lead agent', defaultOwner: 'QA lead',
    file: 'test-cases.md', inputsFrom: ['brd', 'test-scenarios'], readsRawInputs: false, readsFigma: false,
    chunkPrefix: 'TC',
  },
  stories: {
    key: 'stories', title: 'Epics and stories', docTitle: 'Epics and user stories', docCode: 'US',
    agent: 'scrum-master', agentTitle: 'Scrum master agent', defaultOwner: 'Scrum master',
    file: 'stories.md', inputsFrom: ['intake', 'brd'], readsRawInputs: false, readsFigma: true,
    chunkPrefix: 'US',
  },
};

export function isStageKey(value: string): value is StageKey {
  return (STAGE_KEYS as readonly string[]).includes(value);
}
