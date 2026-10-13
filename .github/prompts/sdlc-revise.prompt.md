---
agent: agent
description: Revise an SDLC document that a reviewer sent back with a comment
---
Revise a document that is waiting for review, using the reviewer's comment. Run every command from the repo root.

1. If `npm run sdlc -- projects` lists more than one project, ask the user which one, and add `--project <id>` to every command below.
2. Ask the user which step to revise and what should change, unless they already said.
3. Run `npm run sdlc -- prompt <step> --revise "<the comment>" --out` and follow the instructions file it writes. Change only what the comment asks for and keep every ID that still applies.
4. Write the revised document to the same path, then run `npm run sdlc -- register <step>` and show the guardrail results.
5. Stop and hand back to the reviewer. Do not approve it.
