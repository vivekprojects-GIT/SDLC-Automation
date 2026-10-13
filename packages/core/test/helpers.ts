import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const REPO_ROOT = path.resolve(__dirname, '../../..');
export const SAMPLE = path.join(REPO_ROOT, 'projects', 'sample-commercial-loan');

/** Copies the sample project (inputs and project.yaml only) into a fresh temp folder. */
export async function tempProject(edit?: (yaml: string) => string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sdlc-'));
  await fs.cp(path.join(SAMPLE, 'inputs'), path.join(dir, 'inputs'), { recursive: true });
  const yaml = await fs.readFile(path.join(SAMPLE, 'project.yaml'), 'utf8');
  await fs.writeFile(path.join(dir, 'project.yaml'), edit ? edit(yaml) : yaml);
  return dir;
}

export const reviewer = { name: 'Test Reviewer' };
