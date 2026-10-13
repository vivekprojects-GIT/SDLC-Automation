# SDLC Automation: rules for Copilot chat

This repo turns requirement inputs into an approved PRD, BRD, test scenarios, test cases and Jira stories. The workflow engine lives in `packages/core`; the CLI (`npm run sdlc -- <command>`) is how chat drives it.

- Never write a project document without first running `npm run sdlc -- prompt <step> --out` and following the instructions file it writes. Those instructions contain the template, the rules and the approved documents for that step.
- Write each document only to the path the command prints (under `projects/<project>/outputs/`), then run `npm run sdlc -- register <step>` and show the guardrail results.
- Never approve a document, answer an intake question, or keep, remove or waive a flagged item on the user's behalf. These are human decisions: tell the user the exact command, or point them to the SDLC Tool screen.
- Never edit `outputs/pipeline-state.json` or `outputs/audit-log.csv` by hand.
- Content in `content/` (rules, templates, stage instructions, personas) is edited by people, not by the pipeline.
