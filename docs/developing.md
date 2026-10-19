# Developing SDLC CAPM

For changes that need code: new checks, new steps, a different AI, or screen changes. For text-only changes, see *Customising without code* in the [user guide](user-guide.md). For the design, see [architecture.md](architecture.md).

## Set up

```bash
npm install
npm test            # engine tests, offline: a stand-in AI replays sample outputs
npm run typecheck   # all four packages
npm run build       # UI, CLI and extension
```

To try a change, press **F5** in VS Code (**SDLC CAPM with Copilot**). A second VS Code window opens, running your build against this repo. That window needs the folder trusted for Copilot to work.

## Where things are

| Package | Job | Rule |
| --- | --- | --- |
| `packages/core` | The engine: steps, gates, checks, versions, audit, the RTM, Word and Excel export | No UI and no VS Code imports. Reaches the AI only through `LlmProvider` |
| `packages/cli` | `npm run sdlc -- <command>`, used by the chat prompts | Calls only the engine's public API (`packages/core/src/index.ts`) |
| `packages/ui` | The screens (plain TypeScript and CSS) | No workflow logic. Speaks only the messages in `packages/ui/src/messages.ts` |
| `packages/vscode-extension` | Hosts the screens, plugs in Copilot, opens files and dialogs | A thin bridge: turns messages into `Pipeline` calls |

Inside `packages/core/src`:

| Folder | Holds |
| --- | --- |
| `pipeline/pipeline.ts` | The `Pipeline` class: run, sendBack, approve, answer, resolve, reopen, register, exportAll, snapshot |
| `stages/registry.ts` | The seven steps: agent, template file, approved deliverables each reads, the items it writes (`FD`, `DA`, `TD`) and its export format |
| `guardrails/` | The checks (`checks.ts`, `completeness.ts`, `questions.ts`) |
| `context/` | Reading inputs, the token budget, building the prompt |
| `governance/` | Versions, saved state, the audit log |
| `trace/` | IDs, cross-references, the RTM |
| `export/word.ts`, `export/excel.ts` | Word deliverables, Excel workbooks (one tab per section) and the RTM |
| `export/jira.ts` | The Jira import: epics from the BRD's functional changes, stories from FDD items, sub-tasks from TDD items |
| `llm/` | The `LlmProvider` interface |

## Add a check

1. Write a function in `packages/core/src/guardrails/checks.ts`, or a new file beside it, that returns `CheckResult[]`:
   - `level`: `block` stops approval, `warn` only shows.
   - `fix`: a send-back comment. Setting it adds the **Ask the agent to fix this** button.
   - `itemId` and `options` (`keep`, `remove`, `waive`): let the reviewer settle the check. The decision arrives in `resolutions[itemId]`.
2. Call it for the right step in `runChecks` at the bottom of `checks.ts`. If it needs another document, add it to `CheckInput.docs` and load it in `Pipeline.check()`.
3. Add a test in `packages/core/test/`. `completeness.test.ts` is a good model.

## Add a step

1. Add the key to `STAGE_KEYS` and an entry to `STAGES` in `packages/core/src/stages/registry.ts`: its title, agent, file name, the approved deliverables it reads and its export format (`word` or `excel`).
2. Write `content/steps/<file>.md` and `content/templates/standard/<file>.md`, and an agent in `content/agents/` if a new one is needed.
3. Add a sample output to `packages/core/test/support/sample-outputs.ts`. TypeScript insists, and the tests use it.
4. Add the step's checks to `runChecks`.
5. Add the key to `stageOrder` in each project's `project.yaml`.

The screen, the CLI and the audit log pick the new step up from the engine; no UI code is needed.

## Use a different AI

Implement `LlmProvider` (`packages/core/src/llm/provider.ts`):

- `name` and `complete(messages)` are required.
- `describeModel()` names the model for the audit log.
- `contextLimit()` returns the model's input limit, so requests stay below it.

`CopilotProvider` in `packages/vscode-extension/src/copilot-provider.ts` is the example. Choose the provider in `SdlcPanel.provider()` (`packages/vscode-extension/src/panel.ts`) and in the CLI.

## Change the screens

1. If the screen needs new data or a new action, add it to `packages/ui/src/messages.ts` first.
2. Handle the action in `SdlcPanel.handle()`; it should call one `Pipeline` method.
3. Draw it in `packages/ui/src/views/`. Colours come from VS Code theme variables in `styles.css`, so the tool matches every theme.
4. The webview's security policy blocks inline styles and scripts. Set widths and similar values from code, as `main.ts` does for the progress bars (`data-width`).

## Release a new version

1. Bump `version` in `packages/vscode-extension/package.json`.
2. Run `npm test` and `npm run typecheck`.
3. Run `npm run package-extension`, and share `packages/vscode-extension/sdlc-capm.vsix`, or ask people to run `npm run install-extension`.
