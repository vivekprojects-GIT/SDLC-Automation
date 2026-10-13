---
applyTo: "projects/**/outputs/**"
---
These files are generated SDLC documents under review.

- Keep the front matter between the `---` lines; the pipeline manages it.
- Keep every ID (FR-01, TC-03, US-02) unless the reviewer asks to remove it. Later documents trace back to these IDs.
- Keep each requirement's Source; write ASSUMPTION if it has none.
- After editing, run `npm run sdlc -- status` to see the guardrail results again. A reviewer must still approve the document.
