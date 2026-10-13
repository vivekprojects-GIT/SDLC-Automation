/** An error meant for the person using the tool: the message says what went wrong and how to fix it. */
export class PipelineError extends Error {
  constructor(message: string, readonly details: string[] = []) {
    super(message);
    this.name = 'PipelineError';
  }
}
