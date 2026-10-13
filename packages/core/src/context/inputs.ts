import { promises as fs } from 'node:fs';
import path from 'node:path';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import type { InputInfo } from '../types';
import { toLf } from '../util/markdown';

export interface InputFile extends InputInfo {
  text?: string;
  /** Set when the text was cut to fit the input budget. */
  originalLength?: number;
  image?: { mimeType: string; data: Uint8Array };
}

const TEXT = new Set(['.md', '.txt', '.csv', '.json', '.yaml', '.yml']);
const IMAGES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const SHEET_ROWS = 200;

async function walk(dir: string): Promise<string[]> {
  let entries: import('node:fs').Dirent[] = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

function describe(projectDir: string, file: string, bytes: number): InputInfo {
  const rel = path.relative(path.join(projectDir, 'inputs'), file).split(path.sep).join('/');
  const ext = path.extname(file).toLowerCase();
  const kind = rel.split('/').includes('figma') ? 'figma' : 'document';
  if (TEXT.has(ext) || ext === '.docx' || ext === '.xlsx' || ext === '.xls' || IMAGES[ext]) return { rel, kind, bytes, readable: true };
  if (ext === '.pdf') return { rel, kind, bytes, readable: false, note: 'PDF is not supported yet. Save it as .docx or .txt.' };
  return { rel, kind, bytes, readable: false, note: `${ext || 'This file type'} is not supported, so it was skipped.` };
}

/** Lists input files without reading them. */
export async function listInputs(projectDir: string): Promise<InputInfo[]> {
  const files = await walk(path.join(projectDir, 'inputs'));
  const infos = await Promise.all(files.map(async (f) => describe(projectDir, f, (await fs.stat(f)).size)));
  return infos.sort((a, b) => a.rel.localeCompare(b.rel));
}

/** Reads every input file into text (or an image for Figma exports). */
export async function readInputs(projectDir: string): Promise<InputFile[]> {
  const files = await walk(path.join(projectDir, 'inputs'));
  const out: InputFile[] = [];
  for (const file of files) {
    const info: InputFile = describe(projectDir, file, (await fs.stat(file)).size);
    const ext = path.extname(file).toLowerCase();
    try {
      if (TEXT.has(ext)) info.text = toLf(await fs.readFile(file, 'utf8'));
      else if (ext === '.docx') info.text = toLf((await mammoth.extractRawText({ path: file })).value);
      else if (ext === '.xlsx' || ext === '.xls') info.text = readWorkbook(await fs.readFile(file));
      else if (IMAGES[ext]) info.image = { mimeType: IMAGES[ext], data: new Uint8Array(await fs.readFile(file)) };
    } catch (err: any) {
      info.readable = false;
      info.note = `Could not be read: ${err.message}`;
    }
    out.push(info);
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

function readWorkbook(data: Buffer): string {
  const wb = XLSX.read(data, { type: 'buffer' });
  return wb.SheetNames.map((name) => {
    const rows = XLSX.utils.sheet_to_csv(wb.Sheets[name]).split('\n');
    const shown = rows.slice(0, SHEET_ROWS).join('\n');
    const more = rows.length > SHEET_ROWS ? `\n[${rows.length - SHEET_ROWS} more rows not shown; ${rows.length} rows in total]` : '';
    return `### Sheet: ${name}\n${shown}${more}`;
  }).join('\n\n');
}
