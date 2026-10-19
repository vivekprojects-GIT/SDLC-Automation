import { promises as fs } from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { PipelineError } from './errors';
import type { StageDef } from './stages/registry';
import { toLf } from './util/markdown';

export interface StageContent {
  rules: string;
  persona: string;
  instructions: string;
  template: string;
}

export interface ChecklistItem {
  name: string;
  keywords: string[];
}

async function read(toolRoot: string, rel: string): Promise<string> {
  try {
    return toLf(await fs.readFile(path.join(toolRoot, 'content', rel), 'utf8'));
  } catch {
    throw new PipelineError(`Missing content file: content/${rel}`);
  }
}

export async function loadTemplate(toolRoot: string, pack: string, def: StageDef): Promise<string> {
  try {
    return toLf(await fs.readFile(path.join(toolRoot, 'content', 'templates', pack, def.file), 'utf8'));
  } catch {
    // An org pack may override only some templates; the rest come from the standard pack.
    return read(toolRoot, `templates/standard/${def.file}`);
  }
}

export const WORD_TEMPLATE = 'word-template.docx';

/**
 * The styles of the organisation's Word template, `content/templates/<pack>/word-template.docx`, if the pack has one.
 * Word deliverables then use its fonts, colours and heading styles.
 */
export async function loadWordStyles(toolRoot: string, pack: string): Promise<string | undefined> {
  let bytes: Buffer;
  try {
    bytes = await fs.readFile(path.join(toolRoot, 'content', 'templates', pack, WORD_TEMPLATE));
  } catch {
    return undefined;
  }
  try {
    return (await (await JSZip.loadAsync(bytes)).file('word/styles.xml')?.async('string')) ?? undefined;
  } catch {
    throw new PipelineError(`content/templates/${pack}/${WORD_TEMPLATE} is not a readable Word file.`, ['Save it again from Word as a .docx, or remove it to use the default styles.']);
  }
}

export async function loadStageContent(toolRoot: string, pack: string, def: StageDef): Promise<StageContent> {
  const [rules, persona, instructions, template] = await Promise.all([
    read(toolRoot, 'rules.md'),
    read(toolRoot, `agents/${def.agent}.md`),
    read(toolRoot, `steps/${def.file}`),
    loadTemplate(toolRoot, pack, def),
  ]);
  return { rules, persona, instructions, template };
}

export async function loadChecklist(toolRoot: string): Promise<ChecklistItem[]> {
  const text = await read(toolRoot, 'checklists/nfr.md');
  return text
    .split('\n')
    .map((l) => l.match(/^\s*[-*]\s+([^:]+):\s*(.+)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({
      name: m[1].trim(),
      keywords: m[2].split(',').map((k) => k.trim().toLowerCase()).filter(Boolean),
    }));
}
