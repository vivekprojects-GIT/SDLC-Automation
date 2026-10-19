import { promises as fs } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { captionsToTranscript } from '../src/context/captions';
import { listInputs, readInputs } from '../src/context/inputs';
import { partsUsed } from '../src/guardrails/completeness';
import { tempProject } from './helpers';

// The shape Microsoft Teams exports: cue IDs, <v Speaker> tags, short cues that split one turn.
const TEAMS = `WEBVTT

NOTE Made-up sample for the tests.

0b1e7c4a-1
00:12:40.120 --> 00:12:44.880
<v Priya Shah>We should bring over three years of the old checklist</v>

0b1e7c4a-2
00:12:44.880 --> 00:12:47.010
<v Priya Shah>so we can see a borrower's history.</v>

0b1e7c4a-3
00:18:05.000 --> 00:18:09.500
<v Tom Reid>RMs will not wait more than a few seconds &amp; it has to feel instant.</v>

0b1e7c4a-4
01:05:09.000 --> 01:05:12.000
<v Priya Shah>Senior sign-off starts above $5M.</v>
`;

// Zoom and some other tools put the speaker in the text; .srt numbers its cues and uses commas.
const SRT = `1
00:02:03,500 --> 00:02:06,000
Alex Morgan: The BRD template has more than ten tabs.

2
00:02:06,000 --> 00:02:08,250
Alex Morgan: Most of them are mandatory.
`;

describe('meeting transcripts from Teams and Zoom', () => {
  it('turns a Teams .vtt into one line per speaker turn, keeping when each turn started', () => {
    expect(captionsToTranscript(TEAMS)).toBe(
      [
        "[12:40] Priya Shah: We should bring over three years of the old checklist so we can see a borrower's history.",
        '[18:05] Tom Reid: RMs will not wait more than a few seconds & it has to feel instant.',
        '[1:05:09] Priya Shah: Senior sign-off starts above $5M.',
        '',
      ].join('\n'),
    );
  });

  it('reads speakers written in the text, and .srt timings', () => {
    expect(captionsToTranscript(SRT)).toBe('[02:03] Alex Morgan: The BRD template has more than ten tabs. Most of them are mandatory.\n');
  });

  it('reads .vtt and .srt files in a project, and the intake check knows their timestamps', async () => {
    const dir = await tempProject();
    await fs.writeFile(path.join(dir, 'inputs', 'jad-session-1.vtt'), TEAMS);
    await fs.writeFile(path.join(dir, 'inputs', 'brd-walkthrough.srt'), SRT);
    const listed = await listInputs(dir);
    expect(listed.find((f) => f.rel === 'jad-session-1.vtt')).toMatchObject({ readable: true });
    const read = (await readInputs(dir)).find((f) => f.rel === 'jad-session-1.vtt')!;
    expect(read.text).toContain('[1:05:09] Priya Shah:');

    // An intake that cites only 12:40 is told which parts of the meeting it never used.
    const intake = '## Key facts\n- Three years of history are needed. [jad-session-1.vtt 12:40]\n';
    const [warning] = partsUsed(intake, [{ rel: read.rel, text: read.text! }]);
    expect(warning.message).toContain('18:05, 1:05:09');
    expect(warning.message).not.toContain('12:40');
  });
});
