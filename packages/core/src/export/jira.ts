import { idsIn } from '../util/ids';
import { parseSections } from '../util/markdown';
import { toCsv } from '../util/csv';

export interface Story {
  id: string;
  title: string;
  sentence: string;
  covers: string[];
  figma: string;
  points?: number;
  acceptance: string[];
  subTasks: string[];
}

export interface Epic {
  id: string;
  name: string;
  goal: string;
  stories: Story[];
}

const clean = (s: string) => s.replace(/\*\*/g, '').trim();

/** The bullet list that follows a label line such as "**Acceptance criteria**". */
function listAfter(body: string, label: RegExp): string[] {
  const lines = body.split('\n');
  const start = lines.findIndex((l) => !/^\s*[-*]\s/.test(l) && label.test(l));
  if (start < 0) return [];
  const out: string[] = [];
  for (const l of lines.slice(start + 1)) {
    const m = l.match(/^\s*(?:[-*]|\d+[.)])\s+(.*)$/);
    if (m) out.push(clean(m[1]));
    else if (l.trim() && out.length) break;
    else if (l.trim() && !out.length) break;
  }
  return out;
}

export function parseStories(md: string): Epic[] {
  const sections = parseSections(md);
  const epics: Epic[] = [];
  for (const s of sections) {
    const em = s.level === 2 && clean(s.title).match(/^(EP-\d+)\s*[:.-]?\s*(.*)$/);
    if (em) {
      const goal = s.body.split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#')) ?? '';
      epics.push({ id: em[1], name: em[2] || em[1], goal: clean(goal), stories: [] });
      continue;
    }
    const um = s.level === 3 && clean(s.title).match(/^(US-\d+)\s*[:.-]?\s*(.*)$/);
    if (!um || !epics.length) continue;
    const b = s.body.replace(/\*\*(covers|figma|points):\*\*/gi, '$1:');
    const covers = b.match(/^covers:\s*(.+)$/im)?.[1] ?? '';
    epics.at(-1)!.stories.push({
      id: um[1],
      title: um[2] || um[1],
      sentence: clean(b.match(/^\s*(as an? .+)$/im)?.[1] ?? ''),
      covers: idsIn(covers).filter((x) => x.startsWith('FR-') || x.startsWith('NFR-')),
      figma: clean(b.match(/^figma:\s*(.+)$/im)?.[1] ?? ''),
      points: Number(b.match(/^points:\s*(\d+)/im)?.[1]) || undefined,
      acceptance: listAfter(b, /acceptance criteria/i),
      subTasks: listAfter(b, /sub-?tasks/i),
    });
  }
  return epics;
}

/** CSV for Jira's importer (System > External system import > CSV). Map Issue Id and Parent Id when importing. */
export function toJiraCsv(epics: Epic[]): string {
  const rows: (string | number | undefined)[][] = [['Issue Id', 'Parent Id', 'Issue Type', 'Summary', 'Description', 'Acceptance Criteria', 'Story Points', 'Labels']];
  for (const e of epics) {
    rows.push([e.id, '', 'Epic', e.name, e.goal, '', '', 'sdlc-automation']);
    for (const s of e.stories) {
      const figma = s.figma && s.figma !== '—' && s.figma !== '-' ? `\nFigma: ${s.figma}` : '';
      rows.push([s.id, e.id, 'Story', s.title, `${s.sentence}${figma}`, s.acceptance.join('\n'), s.points, ['sdlc-automation', ...s.covers].join(' ')]);
      s.subTasks.forEach((t, k) => rows.push([`${s.id}-T${k + 1}`, s.id, 'Sub-task', t, '', '', '', 'sdlc-automation']));
    }
  }
  return toCsv(rows);
}
