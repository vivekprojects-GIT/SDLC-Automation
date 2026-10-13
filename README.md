# SDLC Automation Tool

Turns a project's basic requirements and Figma frames into an approved **PRD, BRD, test scenarios, test cases and Jira stories**. GitHub Copilot writes each draft from an org template. A named owner then approves it, edits it or sends it back before the next step starts. Everything runs on your laptop inside VS Code: nothing to host, no API key, no LangGraph.

![The pipeline: inputs, six documents each behind a review gate, then the Jira and traceability export](docs/images/diagram-pipeline.svg)

## Start here

| If you want to… | Read |
| --- | --- |
| Read everything in one place (client-facing) | [docs/user-guide.md](docs/user-guide.md) |
| Install it and run the sample | [docs/getting-started.md](docs/getting-started.md) |
| Understand what it does, the agents and the checks | [docs/how-it-works.md](docs/how-it-works.md) |
| Change agents, templates or the checklist (no code) | [docs/customising.md](docs/customising.md) |
| Add checks, steps, another AI or screen changes (code) | [docs/developing.md](docs/developing.md) |
| See how the parts fit together | [docs/architecture.md](docs/architecture.md) |
| Get answers to the usual questions | [docs/faq.md](docs/faq.md) |

## Quick start

You need Node.js 20+, VS Code 1.95+ and GitHub Copilot signed in.

```bash
npm install
npm run install-extension
```

Reload VS Code with this folder open, then click **SDLC Tool** in the status bar (or run **SDLC: Open SDLC Automation Tool**). The sample project `projects/sample-commercial-loan` is ready to run. VS Code must trust the folder; Copilot is off in Restricted Mode.

Choose the AI model in the tool's top bar. **Auto** uses the most capable model your Copilot plan lets extensions use, and moves on to the next if one is refused. You can also pick any listed model. Requests stay below the chosen model's input limit, and the audit log records which model wrote each document.

Developing the tool itself: open this folder and press F5 (**SDLC Tool with Copilot**).

## Start a new project

1. Copy `projects/sample-commercial-loan` to `projects/<your-project>` and delete its `inputs` and `outputs`.
2. Edit `project.yaml`: name, type (`new-build`, `migration` or `enhancement`), template pack, owners.
3. Put requirement notes, transcripts and documents in `inputs/`, and Figma exports (PNG, or a short `.md` description per frame) in `inputs/figma/`. Readable: `.md`, `.txt`, `.csv`, `.docx`, `.xlsx`. PDF is not supported yet.
4. Open the SDLC Tool and click **Run pipeline**.

## How the review gates work

- Each step writes a draft (v0.1) and runs its **guardrail checks**. The owner can **approve**, **send back with a comment** (the agent revises it to v0.2, v0.3…) or **edit the file directly**.
- Approval is refused while a check blocks. Examples: an unanswered critical intake question, a requirement with no source (keep or remove it), a missing security or accessibility topic (cover or waive it), or a requirement with no test case or story.
- Approval makes the document v1.0, records who approved it and starts the next step.
- **Reopening** an approved document marks every later step out of date.
- Every action, by people and agents, goes into `outputs/audit-log.csv`. The audit log is never sent to the AI.
- **Export** writes `jira-import.csv` (Jira: System → External system import → CSV) and a traceability matrix linking each requirement to its source, scenarios, test cases and stories.

## Repo layout

| Folder | What it holds | Who changes it |
| --- | --- | --- |
| `packages/core` | The workflow engine: steps, gates, guardrails, traceability, export. No UI or VS Code code. | Developers |
| `packages/cli` | Command-line runner on top of the engine | Developers |
| `packages/ui` | The screens. No workflow logic; talks to its host by messages. | Developers |
| `packages/vscode-extension` | Hosts the screens in VS Code and plugs in GitHub Copilot | Developers |
| `content/` | Rules, agent personas, stage instructions, template packs, the mandatory checklist | BAs, PMs, QA leads |
| `projects/` | One folder per project: `project.yaml`, `inputs/`, `outputs/` | Project teams |
| `.github/` | Copilot chat prompts that drive the CLI | Developers |

Dependencies point one way: `ui` → (messages) → `vscode-extension` → `core` ← `cli`. See [docs/architecture.md](docs/architecture.md).

## Use it from Copilot chat instead

In Copilot chat (agent mode), run `/sdlc-next` to write the next document, `/sdlc-revise` to revise one and `/sdlc-status` to see where things are. Chat writes the document; the CLI versions it, checks it and logs it. Approvals stay with people:

```bash
npm run sdlc -- approve brd --as "Your Name"
```

Run `npm run sdlc -- help` for every command.

## Large inputs

Each step sends the AI only what it needs: the approved documents before it, never the whole history. Requests are sized from the chosen model's limit; intake trims oversized input files and warns the reviewer. Long test-case and story documents are written in natural pieces (test cases per group of scenarios; stories as an epic plan, then a few epics at a time) and joined. Afterwards any requirement still missing a scenario, test case or story is written automatically, so a reply that was cut short doesn't reach the reviewer with gaps. The budget settings in `project.yaml` are optional overrides.

## Tests

```bash
npm test
npm run typecheck
```

The tests run the whole pipeline offline, with a stand-in AI that replays sample outputs in place of Copilot.
