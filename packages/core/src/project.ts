import { promises as fs } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { PipelineError } from './errors';
import { STAGES, STAGE_KEYS, isStageKey, type StageKey } from './stages/registry';

export const PROJECT_TYPES = ['new-build', 'migration', 'enhancement'] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export interface ProjectConfig {
  id: string;
  dir: string;
  name: string;
  type: ProjectType;
  templatePack: string;
  stageOrder: StageKey[];
  owners: Record<StageKey, string>;
  budget: {
    /** Optional cap on one request. Without it the chosen model's own limit applies. */
    maxInputTokens?: number;
    /** How long one reply can safely be. Longer documents are written in pieces. */
    maxOutputTokens: number;
    /** Optional: units per piece (scenarios for test cases, requirements for stories), instead of the automatic size. */
    chunkSize?: number;
  };
}

export const DEFAULT_MAX_OUTPUT_TOKENS = 8000;

const optionalNumber = (v: unknown): number | undefined => {
  const n = Number(v);
  return v === undefined || v === null || v === '' || !Number.isFinite(n) || n <= 0 ? undefined : n;
};

export async function loadProject(dir: string): Promise<ProjectConfig> {
  const file = path.join(dir, 'project.yaml');
  let raw: Record<string, any>;
  try {
    raw = YAML.parse(await fs.readFile(file, 'utf8')) ?? {};
  } catch (err: any) {
    if (err?.code === 'ENOENT') throw new PipelineError(`No project.yaml found in ${dir}.`, ['Copy projects/sample-commercial-loan to start a new project.']);
    throw new PipelineError(`project.yaml could not be read: ${err.message}`);
  }

  const order: string[] = Array.isArray(raw.stageOrder) ? raw.stageOrder.map(String) : [...STAGE_KEYS];
  const unknown = order.filter((k) => !isStageKey(k));
  if (unknown.length) throw new PipelineError(`project.yaml lists unknown steps: ${unknown.join(', ')}.`, [`Use only: ${STAGE_KEYS.join(', ')}.`]);
  if (order[0] !== 'intake') throw new PipelineError('project.yaml: the first step in stageOrder must be intake.');

  const type = String(raw.type ?? 'new-build') as ProjectType;
  if (!PROJECT_TYPES.includes(type)) throw new PipelineError(`project.yaml: type "${type}" is not one of ${PROJECT_TYPES.join(', ')}.`);

  const owners = Object.fromEntries(STAGE_KEYS.map((k) => [k, String(raw.owners?.[k] ?? STAGES[k].defaultOwner)])) as Record<StageKey, string>;

  return {
    id: path.basename(dir),
    dir,
    name: String(raw.name ?? path.basename(dir)),
    type,
    templatePack: String(raw.templatePack ?? 'standard'),
    stageOrder: order as StageKey[],
    owners,
    budget: {
      maxInputTokens: optionalNumber(raw.budget?.maxInputTokens),
      maxOutputTokens: optionalNumber(raw.budget?.maxOutputTokens) ?? DEFAULT_MAX_OUTPUT_TOKENS,
      chunkSize: optionalNumber(raw.budget?.chunkSize),
    },
  };
}

/** Lists the folders under projects/ that have a project.yaml. */
export async function listProjects(toolRoot: string): Promise<{ id: string; name: string; dir: string }[]> {
  const root = path.join(toolRoot, 'projects');
  let entries: string[] = [];
  try {
    entries = await fs.readdir(root);
  } catch {
    return [];
  }
  const out: { id: string; name: string; dir: string }[] = [];
  for (const e of entries.sort()) {
    const dir = path.join(root, e);
    try {
      const p = await loadProject(dir);
      out.push({ id: p.id, name: p.name, dir });
    } catch {
      /* not a project folder */
    }
  }
  return out;
}

/** Walks up from a folder to the repo root: the folder that has content/stages. */
export async function findToolRoot(start: string): Promise<string | undefined> {
  let dir = path.resolve(start);
  for (;;) {
    try {
      await fs.access(path.join(dir, 'content', 'stages'));
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) return undefined;
      dir = parent;
    }
  }
}
