export interface LlmImage {
  name: string;
  mimeType: string;
  data: Uint8Array;
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: LlmImage[];
}

/**
 * The only way the engine talks to an AI model. The VS Code extension plugs in
 * GitHub Copilot; the tests use a stand-in with sample outputs.
 */
export interface LlmProvider {
  readonly name: string;
  complete(messages: LlmMessage[], options?: { signal?: AbortSignal }): Promise<string>;
  /** The model behind the last request, for the audit log. */
  describeModel?(): string | undefined;
  /** How many input tokens the current model accepts, so requests are capped below it. */
  contextLimit?(): Promise<number | undefined>;
}
