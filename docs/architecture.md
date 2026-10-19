# Architecture

![Architecture: the screen, Copilot Chat and the command line all use the same core engine; the extension sends requests to GitHub Copilot](images/diagram-architecture.svg)

## Rules that keep it modular

1. **`core` stands alone.** It has no UI and no VS Code imports. It reaches an AI only through the `LlmProvider` interface (`packages/core/src/llm/provider.ts`). The extension plugs in `CopilotProvider`; the tests use a stand-in that replays sample outputs (`packages/core/test/support/`).
2. **`ui` holds no workflow logic.** It sends the messages in `packages/ui/src/messages.ts` (run, approve, send back, answer, resolve…) and draws the `PipelineSnapshot` it gets back. To host the same screens in a browser later, write a new host that speaks the same messages.
3. **`vscode-extension` is a thin bridge.** It turns messages into `Pipeline` calls, opens files and dialogs, and watches for edits.
4. **Both front doors share the engine.** The screen and Copilot chat (through the CLI) end up in the same `Pipeline` methods, so gates and checks behave the same.
5. **Content is data.** Templates, step instructions (`content/steps/`), agents, rules and the NFR checklist are Markdown in `content/`, editable without code.
6. **State lives with the project.** `projects/<id>/outputs/` holds the deliverables (with front matter), `pipeline-state.json`, `audit-log.csv`, the RTM and the Planview/PPP files and Jira import in `deliverables/`.

## Inside core

| Folder | Job |
| --- | --- |
| `pipeline/` | The `Pipeline` class: run, send back, approve, answer, resolve, reopen, register, export, snapshot |
| `stages/` | The seven PDLC Planning steps: agent, template, approved deliverables each one reads, the items it writes and its export format |
| `context/` | Reading inputs (.md, .txt, .csv, .docx, .xlsx, images), the token budget, building prompts |
| `guardrails/` | Checks run before every approval |
| `governance/` | Versions, saved state, the audit log |
| `trace/` | IDs, cross-references and the RTM: BRD ID → FDD → DRD → TDD → SIT and UAT scope |
| `export/` | Word (`word.ts`) and Excel (`excel.ts`) deliverables, including the RTM with its T2BAU columns |
| `llm/` | The provider interface |

## Adding a template pack

Create `content/templates/<org>/` with any of `intake.md`, `brd.md`, `fdd.md`, `dsd.md`, `tdd.md`, `sit-strategy.md` and `uat-strategy.md`, and optionally `word-template.docx` for the Word styles. Missing files fall back to `standard`. Set `templatePack: <org>` in the project's `project.yaml`. Each `##` heading in a template becomes a required section and an Excel tab; the ID in a table's first column and the IDs a row names drive traceability, and the BRD's `Source` column drives the source check.
