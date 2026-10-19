---
agent: agent
description: Write the next PDLC deliverable (intake, BRD, FDD, SIT or UAT QA Strategy, DUT, SIT or UAT cases) and stop for review
---
Run the next step of the SDLC pipeline, then stop for human review. Run every command from the repo root.

1. Run `npm run sdlc -- projects`. If it lists more than one project, ask the user which one, and add `--project <id>` to every command below.
2. Run `npm run sdlc -- status`. Find the first step whose status is `ready` or `stale`. If there is none, tell the user what is waiting for review and by whom, and stop.
3. Run `npm run sdlc -- prompt <step> --out`. It prints where it wrote the instructions and where the document goes.
4. Read the instructions file it wrote and follow it exactly. Look at any Figma images it lists. Write the finished document to the path it printed, and nothing else.
5. Run `npm run sdlc -- register <step>` and show the user the guardrail results.
6. Stop. Tell the user who must approve the document and how: in the SDLC CAPM screen, or `npm run sdlc -- approve <step> --as "<their name>"`. Do not approve it yourself, answer intake questions, or keep, remove or waive flagged items.
