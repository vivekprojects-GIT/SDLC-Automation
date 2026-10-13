import type { CheckResult, Resolution } from '../types';
import { normalizeHeading, parseSections } from '../util/markdown';

/** A source reference such as "requirement-notes.md §2", "kickoff-call-transcript.txt 12:40" or "legacy.csv row 5". */
interface SourceRef {
  stem: string;
  locator?: string;
}

export interface KeyFact {
  id: string;
  text: string;
  refs: SourceRef[];
  numbers: string[];
}

const FILE = /([\w./-]+?)\.(?:md|txt|csv|docx|xlsx|xls|json|png|jpe?g)\b/i;
const LOCATOR = /§\s*\d+(?:\.\d+)*|\b\d{1,2}:\d{2}\b|\brow\s*\d+/i;
// A value such as 1.25x, 75%, $10M or 5 seconds. Not followed by a letter, or by ".digit" (so "1" is never cut out of "1.25").
const NUMBER = /\$?\d[\d,]*(?:\.\d+)?\s?(?:x|%|m|k|bn|million|years?|days?|hours?|minutes?|seconds?)?(?!\w)(?!\.\d)/gi;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ');
const stemOf = (file: string) => file.split('/').pop()!.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const locOf = (l: string) => l.toLowerCase().replace(/\s+/g, '');
const numOf = (n: string) => n.toLowerCase().replace(/[\s,]/g, '');

/** A stable id for a fact, so a reviewer's decision about it survives revisions that keep the wording. */
function factId(text: string): string {
  let h = 5381;
  for (const c of norm(text)) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  return `fact:${h.toString(36)}`;
}

/** The bullets of the intake summary's "Key facts" section, with their sources and numbers. */
export function parseKeyFacts(intake: string): KeyFact[] {
  const section = parseSections(intake).find((s) => s.level === 2 && normalizeHeading(s.title) === 'key facts');
  if (!section) return [];
  return section.body
    .split('\n')
    .map((l) => l.match(/^\s*[-*]\s+(.+)$/)?.[1]?.trim())
    .filter((t): t is string => !!t)
    .map((text) => {
      const brackets = [...text.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
      const refs = brackets
        .flatMap((b) => b.split(/;/))
        .map((part): SourceRef | null => {
          const file = part.match(FILE);
          if (!file) return null;
          const locator = part.match(LOCATOR)?.[0];
          return { stem: stemOf(file[1]), locator: locator ? locOf(locator) : undefined };
        })
        .filter((r): r is SourceRef => !!r);
      const plain = text.replace(/\[[^\]]*\]/g, ' ');
      const numbers = [...new Set((plain.match(NUMBER) ?? []).map(numOf))];
      return { id: factId(text), text: plain.replace(/\s+/g, ' ').trim(), refs, numbers };
    });
}

/** True when some line of the BRD names the same file (and section, timestamp or row, if the fact has one). */
function sourceCited(brdLines: string[], ref: SourceRef): boolean {
  return brdLines.some((line) => {
    const flat = line.toLowerCase().replace(/[^a-z0-9§:]+/g, ' ');
    if (!flat.includes(ref.stem)) return false;
    return !ref.locator || line.toLowerCase().replace(/\s+/g, '').includes(ref.locator);
  });
}

/** "5 seconds", "$10,000,000" and "1.25 x" in the BRD match "5seconds", "$10000000" and "1.25x" from a fact. */
function numberPresent(brd: string, n: string): boolean {
  const text = brd
    .toLowerCase()
    .replace(/(\d),(?=\d)/g, '$1')
    .replace(/(\d)\s+(?=(?:x|%|m|k|bn|million|years?|days?|hours?|minutes?|seconds?)\b)/g, '$1');
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^0-9.])${escaped}($|[^0-9])`).test(text);
}

/**
 * Every key fact from the approved intake should reach the BRD. A fact whose source the BRD never
 * cites blocks approval until it is added or waived as context; a fact whose numbers are missing warns.
 */
export function intakeCompleteness(intake: string | undefined, brd: string, resolutions: Record<string, Resolution>): CheckResult[] {
  if (!intake) return [];
  const facts = parseKeyFacts(intake);
  if (!facts.length) return [];
  const lines = brd.split('\n');
  const out: CheckResult[] = [];
  let carried = 0;
  for (const f of facts) {
    const missingSource = f.refs.length > 0 && !f.refs.some((r) => sourceCited(lines, r));
    const missingNumbers = f.numbers.filter((n) => !numberPresent(brd, n));
    if (!missingSource && !missingNumbers.length) {
      carried++;
      continue;
    }
    if (resolutions[f.id] === 'waive') {
      out.push({ id: f.id, level: 'pass', message: `Intake fact waived as context, not a requirement: "${f.text}"` });
      continue;
    }
    if (missingSource) {
      out.push({
        id: f.id,
        level: 'block',
        message: `This intake fact is not in the BRD: "${f.text}". Add a requirement for it, or waive it if it is context rather than a requirement.`,
        itemId: f.id,
        options: ['waive'],
        fix: `Add a requirement for this intake fact, citing its source: "${f.text}"`,
      });
    } else {
      out.push({
        id: f.id,
        level: 'warn',
        message: `The BRD may not carry ${missingNumbers.join(', ')} from this intake fact: "${f.text}"`,
        fix: `Check the requirements carry the exact values from this intake fact (${missingNumbers.join(', ')}): "${f.text}"`,
      });
    }
  }
  if (carried) out.unshift({ id: 'completeness', level: 'pass', message: `${carried} of ${facts.length} intake facts are carried into the BRD` });
  return out;
}

/** The numbered sections (§2) and transcript timestamps (12:40) of an input file. */
function partsOf(text: string): string[] {
  const parts = new Set<string>();
  for (const line of text.split('\n')) {
    const section = line.match(/^#{1,6}\s*(§\s*\d+(?:\.\d+)*)/);
    if (section) parts.add(locOf(section[1]));
    const stamp = line.match(/^\s*\[?(\d{1,2}:\d{2})\]?/);
    if (stamp) parts.add(stamp[1]);
  }
  return [...parts];
}

/**
 * Each numbered section and transcript timestamp in the inputs should be used by the intake summary,
 * as a fact or a question. A warning, because some parts are only context.
 */
export function partsUsed(intake: string, inputs: { rel: string; text: string }[]): CheckResult[] {
  const lines = intake.split('\n');
  const out: CheckResult[] = [];
  for (const f of inputs) {
    const stem = stemOf(f.rel.replace(/\.[^.]+$/, ''));
    const unused = partsOf(f.text).filter((p) => !sourceCited(lines, { stem, locator: p }));
    if (!unused.length) continue;
    out.push({
      id: `parts:${f.rel}`,
      level: 'warn',
      message: `The intake summary does not use these parts of ${f.rel}: ${unused.join(', ')}. Check none of them holds a requirement.`,
      fix: `Check ${f.rel} at ${unused.join(', ')} and add any facts or open questions they contain, with their sources.`,
    });
  }
  return out;
}

/** Every readable input file should be mentioned in the intake summary, so none is skipped. */
export function inputsCited(intake: string, inputs: string[]): CheckResult[] {
  if (!inputs.length) return [];
  const flat = intake.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const missed = inputs.filter((rel) => !flat.includes(stemOf(rel.replace(/\.[^.]+$/, ''))));
  if (!missed.length) return [{ id: 'inputs', level: 'pass', message: `All ${inputs.length} input files are used` }];
  return missed.map((rel) => ({
    id: `inputs:${rel}`,
    level: 'block' as const,
    message: `The intake summary does not mention ${rel}, so it may have been skipped.`,
    fix: `Read ${rel} and add its facts, with their sources, to the summary. List it under Sources read.`,
  }));
}
