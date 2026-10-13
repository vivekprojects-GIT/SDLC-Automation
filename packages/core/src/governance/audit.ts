import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AuditEntry } from '../types';
import { parseCsv, toCsv } from '../util/csv';

const HEADER = ['timestamp', 'stage', 'action', 'actor', 'version', 'detail'];

export const auditFile = (projectDir: string) => path.join(projectDir, 'outputs', 'audit-log.csv');

/** Appends one row to outputs/audit-log.csv. The log is never sent to the AI. */
export async function appendAudit(projectDir: string, e: AuditEntry): Promise<void> {
  const file = auditFile(projectDir);
  await fs.mkdir(path.dirname(file), { recursive: true });
  let exists = true;
  try {
    await fs.access(file);
  } catch {
    exists = false;
  }
  const rows = exists ? [] : [HEADER];
  rows.push([e.at, e.stage, e.action, e.actor, e.version, e.detail]);
  await fs.appendFile(file, toCsv(rows), 'utf8');
}

/** Newest first. */
export async function readAudit(projectDir: string, limit = 200): Promise<AuditEntry[]> {
  let text = '';
  try {
    text = await fs.readFile(auditFile(projectDir), 'utf8');
  } catch {
    return [];
  }
  return parseCsv(text)
    .slice(1)
    .filter((r) => r.length >= 6)
    .map(([at, stage, action, actor, version, detail]) => ({ at, stage, action, actor, version, detail }))
    .reverse()
    .slice(0, limit);
}
