// The public API of the workflow engine. The CLI, the VS Code extension and the UI import only from here.
export { Pipeline, type PipelineEvent, type PipelineOptions } from './pipeline/pipeline';
export { PipelineError } from './errors';
export { STAGES, STAGE_KEYS, isStageKey, type ItemPrefix, type StageDef, type StageKey } from './stages/registry';
export { loadProject, listProjects, findToolRoot, PROJECT_TYPES, type ProjectConfig, type ProjectType } from './project';
export type { LlmImage, LlmMessage, LlmProvider } from './llm/provider';
export { estimateTokens, messageTokens } from './context/budget';
export { buildMatrix, coverageOf, uncovered } from './trace/matrix';
export { extractItems, requirementIds } from './trace/items';
export { buildJiraIssues, type JiraIssue } from './export/jira';
export { parseQuestions } from './guardrails/questions';
export type * from './types';
