import { toLf } from '../util/markdown';

/**
 * Meeting transcripts exported from Teams or Zoom (.vtt, or .srt) turned into the plain form the
 * rest of the tool reads: one line per speaker turn, "[12:40] Jane Smith: …". Consecutive cues from
 * the same speaker are merged, so a long meeting does not fill the request with fragments, and each
 * line keeps the time its turn started, so citations and the "every timestamp used" check work.
 */
export function captionsToTranscript(raw: string): string {
  const blocks = toLf(raw).replace(/^﻿/, '').split(/\n{2,}/);
  const turns: { at: string; speaker: string; text: string }[] = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const timing = lines.findIndex((l) => l.includes('-->'));
    if (timing < 0) continue; // the WEBVTT header, NOTE, STYLE and REGION blocks, cue numbers on their own
    const at = stamp(lines[timing].split('-->')[0].trim());
    if (!at) continue;
    let speaker = '';
    const text = lines
      .slice(timing + 1)
      .map((l) => {
        const voice = l.match(/<v(?:\.[^\s>]+)?\s+([^>]+)>/);
        if (voice) speaker = voice[1].trim();
        return l.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();
      })
      .filter(Boolean)
      .join(' ');
    if (!text) continue;
    // Some exports put the speaker as plain "Name: text" instead of a <v> tag.
    if (!speaker) {
      const named = text.match(/^([A-Z][\w.'-]*(?: [A-Z][\w.'-]*){0,3}):\s+(.*)$/);
      if (named) {
        speaker = named[1];
        turns.push(merge(turns, at, speaker, named[2]));
        continue;
      }
    }
    turns.push(merge(turns, at, speaker, text));
  }
  return turns
    .filter((t) => t.text)
    .map((t) => `[${t.at}]${t.speaker ? ` ${t.speaker}:` : ''} ${t.text}`)
    .join('\n')
    .concat('\n');
}

/** Appends to the last turn when the same speaker carries on; otherwise starts a new turn. */
function merge(turns: { at: string; speaker: string; text: string }[], at: string, speaker: string, text: string) {
  const last = turns.at(-1);
  if (last && last.speaker === speaker && speaker) {
    last.text = `${last.text} ${text}`;
    return { at: '', speaker: '', text: '' }; // dropped by the filter above
  }
  return { at, speaker, text };
}

/** "00:12:40.340" or "00:12:40,340" → "12:40"; "01:05:09.000" → "1:05:09". */
function stamp(time: string): string | undefined {
  const m = time.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})(?:[.,]\d+)?$/);
  if (!m) return undefined;
  const hours = Number(m[1] ?? 0);
  const minutes = m[2].padStart(2, '0');
  return hours ? `${hours}:${minutes}:${m[3]}` : `${minutes}:${m[3]}`;
}
