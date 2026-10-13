import { MODE_MARKER, STAGE_MARKER } from '../../src/context/prompt';
import { isStageKey } from '../../src/stages/registry';
import { FAKE_FIXTURES } from './sample-outputs';
import type { LlmMessage, LlmProvider } from '../../src/llm/provider';

const between = (text: string, start: string, end: string) => {
  const a = text.indexOf(start);
  const b = text.indexOf(end, a + start.length);
  return a >= 0 && b > a ? text.slice(a + start.length, b) : '';
};

/**
 * An offline stand-in for the AI. It answers every step with the sample project's
 * documents, and answers a "send back" by noting the comment at the top of the document.
 */
export class FakeProvider implements LlmProvider {
  readonly name = 'Fake AI (offline sample)';
  readonly calls: LlmMessage[][] = [];

  constructor(private readonly options: { delayMs?: number } = {}) {}

  describeModel() {
    return 'fake/sample-fixtures';
  }

  async complete(messages: LlmMessage[]): Promise<string> {
    this.calls.push(messages);
    if (this.options.delayMs) await new Promise((r) => setTimeout(r, this.options.delayMs));
    const system = messages.find((m) => m.role === 'system')?.content ?? '';
    const user = messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n');
    const stage = system.match(new RegExp(`^${STAGE_MARKER}\\s*(\\S+)`, 'm'))?.[1] ?? '';
    const mode = system.match(new RegExp(`^${MODE_MARKER}\\s*(\\S+)`, 'm'))?.[1] ?? 'draft';

    if (mode === 'revise') {
      const doc = between(user, '<current_document>\n', '\n</current_document>');
      const comment = between(user.slice(user.indexOf('<reviewer_comment')), '>\n', '\n</reviewer_comment>').trim();
      const lines = doc.split('\n');
      const title = lines.findIndex((l) => l.startsWith('# '));
      lines.splice(title + 1, 0, '', `> Revised for the reviewer's comment: "${comment}"`);
      return lines.join('\n');
    }
    if (!isStageKey(stage)) throw new Error(`The fake AI has no sample output for step "${stage}".`);
    return FAKE_FIXTURES[stage];
  }
}
