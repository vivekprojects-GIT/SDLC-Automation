import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type { ProjectConfig } from './project';
import type { StageKey } from './stages/registry';
import { toLf } from './util/markdown';

export interface DocMeta {
  document: string;
  project: string;
  version: string;
  status: 'draft' | 'approved';
  owner: string;
  template: string;
  generated_by?: string;
  approved_by?: string;
  approved_at?: string;
  [key: string]: unknown;
}

export function docFile(project: ProjectConfig, key: StageKey): string {
  const index = project.stageOrder.indexOf(key);
  return path.join(project.dir, 'outputs', `${String(index).padStart(2, '0')}-${key}.md`);
}

export function relToProject(project: ProjectConfig, file: string): string {
  return path.relative(project.dir, file).split(path.sep).join('/');
}

export function splitFrontMatter(text: string): { meta: Record<string, unknown>; body: string } {
  const t = toLf(text);
  const m = t.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: t };
  let meta: Record<string, unknown> = {};
  try {
    meta = YAML.parse(m[1]) ?? {};
  } catch {
    meta = {};
  }
  return { meta, body: t.slice(m[0].length) };
}

export async function readDoc(file: string): Promise<{ meta: Record<string, unknown>; body: string } | null> {
  try {
    return splitFrontMatter(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

export async function writeDoc(file: string, meta: DocMeta, body: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const clean = Object.fromEntries(Object.entries(meta).filter(([, v]) => v !== undefined));
  await fs.writeFile(file, `---\n${YAML.stringify(clean).trimEnd()}\n---\n\n${body.trim()}\n`, 'utf8');
}

export function hashBody(body: string): string {
  return createHash('sha256').update(toLf(body).trim()).digest('hex').slice(0, 16);
}
