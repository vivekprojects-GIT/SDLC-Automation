---
agent: agent
description: Show where the SDLC pipeline is and what each reviewer needs to do
---
Run `npm run sdlc -- projects` from the repo root. For each project it lists, run `npm run sdlc -- status --project <id>`. Summarise in plain words: which documents are approved, which are waiting for review and by whom, and any checks that block approval. If every step of a project is approved, suggest `npm run sdlc -- export --project <id>`.
