import type { LlmMessage } from '../llm/provider';
import type { InputFile } from './inputs';

/** A rough count that errs on the safe side: about 4 characters per token. */
export const estimateTokens = (text: string) => Math.ceil(text.length / 4);
export const IMAGE_TOKENS = 800;

export function messageTokens(messages: LlmMessage[]): number {
  return messages.reduce((n, m) => n + estimateTokens(m.content) + (m.images?.length ?? 0) * IMAGE_TOKENS, 0);
}

/**
 * Cuts the text of the largest input files so all of them fit in maxTokens.
 * Small files are kept whole. Returns one note per file that was cut.
 */
export function fitInputs(files: InputFile[], maxTokens: number): { rel: string; message: string }[] {
  const texts = files.filter((f) => f.text !== undefined);
  const total = texts.reduce((n, f) => n + estimateTokens(f.text!), 0);
  if (total <= maxTokens) return [];
  const notes: { rel: string; message: string }[] = [];
  let remaining = maxTokens;
  const bySize = [...texts].sort((a, b) => a.text!.length - b.text!.length);
  bySize.forEach((f, i) => {
    const share = Math.floor(remaining / (bySize.length - i));
    const tokens = estimateTokens(f.text!);
    if (tokens <= share) {
      remaining -= tokens;
      return;
    }
    f.originalLength ??= f.text!.length;
    const keep = Math.max(0, share * 4 - 120);
    f.text = `${f.text!.slice(0, keep)}\n[... the rest of this file was not read, to stay within the input budget ...]`;
    const pct = Math.round((keep / f.originalLength) * 100);
    notes.push({ rel: f.rel, message: `${f.rel} was too long, so only the first ${pct}% was read. Split it or raise budget.maxInputTokens in project.yaml.` });
    remaining -= share;
  });
  return notes;
}
