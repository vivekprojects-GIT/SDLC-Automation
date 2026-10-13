import type { StageContent } from '../content';
import type { LlmImage, LlmMessage } from '../llm/provider';
import type { ProjectConfig } from '../project';
import type { StageDef, StageKey } from '../stages/registry';
import { padId } from '../util/ids';
import type { InputFile } from './inputs';

export interface UpstreamDoc {
  key: StageKey;
  title: string;
  version: string;
  body: string;
}

export interface EpicPlan {
  id: string;
  name: string;
  covers: string[];
}

/** One piece of a document written in parts, or a request for only the items still missing. */
export type Piece =
  | { kind: 'requirements'; ids: string[]; startAt: number; epicStartAt: number }
  | { kind: 'scenarios'; ids: string[]; scenarios: string[]; startAt: number }
  | { kind: 'epic-plan'; ids: string[] }
  | { kind: 'epics'; ids: string[]; epics: EpicPlan[]; startAt: number }
  | { kind: 'gaps'; ids: string[]; startAt: number; epicStartAt: number };

export interface PromptInput {
  def: StageDef;
  mode: 'draft' | 'revise';
  content: StageContent;
  project: ProjectConfig;
  upstream: UpstreamDoc[];
  inputs?: InputFile[];
  removed: string[];
  piece?: Piece;
  current?: string;
  comment?: string;
}

const ITEM = { TS: 'scenario', TC: 'test case', US: 'story' } as const;

function pieceText(p: PromptInput, piece: Piece): string {
  const prefix = p.def.chunkPrefix ?? (p.def.key === 'test-scenarios' ? 'TS' : 'TC');
  const plural = prefix === 'US' ? 'stories' : `${ITEM[prefix]}s`;
  switch (piece.kind) {
    case 'requirements':
      return `# This part only\nWrite items only for these requirements: ${piece.ids.join(', ')}.\nNumber ${prefix} items starting at ${padId(prefix, piece.startAt)}.${prefix === 'US' ? ` Number epics starting at ${padId('EP', piece.epicStartAt)}.` : ''}`;
    case 'scenarios':
      return `# This part only\nWrite test cases only for these scenarios: ${piece.scenarios.join(', ')}. They cover: ${piece.ids.join(', ')}.\nNumber TC items starting at ${padId('TC', piece.startAt)}.`;
    case 'epic-plan':
      return `# Plan the epics only\nGroup these requirements into epics: ${piece.ids.join(', ')}. Put every requirement in exactly one epic.\nFor each epic return only two lines: "## EP-01 <Epic name>" and under it "Covers: <FR IDs>". Write no stories yet.`;
    case 'epics':
      return `# This part only\nWrite only these epics, keeping their IDs and names, with stories for the requirements they cover:\n${piece.epics.map((e) => `- ${e.id} ${e.name} (covers ${e.covers.join(', ')})`).join('\n')}\nNumber US items starting at ${padId('US', piece.startAt)}.`;
    case 'gaps':
      return `# Missing items only\nThese requirements still have no ${ITEM[prefix]}: ${piece.ids.join(', ')}. Write ${plural} only for them, in the template's format, and repeat nothing that already exists.\nNumber ${prefix} items starting at ${padId(prefix, piece.startAt)}.${prefix === 'US' ? ` Put the stories in new epics numbered from ${padId('EP', piece.epicStartAt)}.` : ''}`;
  }
}

/** Wraps a block in a tag such as <input_file name="notes.md">…</input_file>. */
function tag(name: string, body: string, attrs: Record<string, string> = {}): string {
  const a = Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${v.replace(/"/g, "'")}"`)
    .join('');
  return `<${name}${a}>\n${body.trim()}\n</${name}>`;
}

function modeOf(p: PromptInput): string {
  if (!p.piece) return p.mode;
  return p.piece.kind === 'epic-plan' ? 'epic-plan' : p.piece.kind === 'gaps' ? 'gaps' : 'chunk';
}

/** Marker lines that say which step and mode a request is for (the tests' stand-in AI reads them). */
export const STAGE_MARKER = 'STAGE:';
export const MODE_MARKER = 'MODE:';

export function buildMessages(p: PromptInput): LlmMessage[] {
  const owner = p.project.owners[p.def.key];
  const template = p.content.template.replaceAll('{{project}}', p.project.name);
  const mode = modeOf(p);

  // The system message: who the agent is, the rules, this step's task and the output template,
  // each in its own tagged block so instructions never blur into material.
  const system = [
    `${STAGE_MARKER} ${p.def.key}`,
    `${MODE_MARKER} ${mode}`,
    '',
    tag('role', p.content.persona),
    tag('rules', p.content.rules),
    tag('task', p.content.instructions),
    tag('template', `Write the document in this template. Keep its headings in order and its table columns in order. Replace each <!-- guidance --> comment with content.\n\n${template.trim()}`),
  ].join('\n\n');

  // The user message: the material, each piece tagged and labelled, then what to return.
  const parts: string[] = [tag('project', `Name: ${p.project.name}\nType: ${p.project.type}\nOwner of this document: ${owner}`)];
  if (p.removed.length) parts.push(tag('removed_requirements', `Reviewers removed these. Do not use them: ${p.removed.join(', ')}`));
  for (const u of p.upstream) parts.push(tag('approved_document', u.body, { title: u.title, version: u.version }));

  const inputs = p.inputs ?? [];
  for (const f of inputs.filter((f) => f.text !== undefined)) parts.push(tag('input_file', f.text!, { name: f.rel }));
  const images = inputs.filter((f) => f.image).map((f) => f.rel);
  if (images.length) parts.push(tag('attached_images', `These Figma frames are attached as images:\n${images.map((n) => `- ${n}`).join('\n')}`));
  const unread = inputs.filter((f) => !f.readable && f.note);
  if (unread.length) parts.push(tag('unreadable_files', unread.map((f) => `- ${f.rel}: ${f.note}`).join('\n')));

  if (p.piece) parts.push(tag('this_request', pieceText(p, p.piece)));

  if (p.piece?.kind === 'epic-plan') {
    parts.push('Return only the epic plan.');
  } else if (p.piece?.kind === 'gaps') {
    parts.push('Return only the new items. For a table, return the table header and the new rows.');
  } else if (p.mode === 'revise') {
    parts.push(
      tag('current_document', p.current ?? ''),
      tag('reviewer_comment', p.comment ?? '', { from: owner }),
      'Return the complete revised document. Change only what the reviewer comment asks for, keep everything else as it is, and keep every ID that still applies. Check the result against the quality bar in <task> before you answer.',
    );
  } else {
    parts.push(`Write the ${p.def.docTitle} now. Check it against the quality bar in <task>, then return only the Markdown document.`);
  }

  const attached: LlmImage[] = inputs.filter((f) => f.image).map((f) => ({ name: f.rel, ...f.image! }));
  return [
    { role: 'system', content: system },
    { role: 'user', content: parts.join('\n\n'), images: attached.length ? attached : undefined },
  ];
}
