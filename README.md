# SDLC CAPM

Writes MUFG's PDLC Planning-phase deliverables with GitHub Copilot, in MUFG's layout: the **BRD, FDD, DRD/DSD, TDD, and SIT and UAT QA Strategies**, plus the **Requirements Traceability Matrix with its Transition to BAU plan**. Each deliverable is checked in code and approved by its named owner before the next one starts, then exported as Word and Excel files ready for Planview or PPP, with a Jira import of the stories for the delivery team. Everything runs on your laptop inside VS Code: nothing to host, no API key.

![The SDLC CAPM pipeline: inputs, seven Planning deliverables each behind a review gate, then the Planview/PPP files](docs/images/diagram-pipeline.svg)

| Step | Deliverable | Default owner | Exported as |
| --- | --- | --- | --- |
| 1 | Intake summary: key facts, gaps and open questions | Project manager | Word |
| 2 | Business Requirement Document | Business analyst | Excel, one tab per section |
| 3 | Functional Design Document | IT lead | Excel |
| 4 | Data Requirement and Data Sourcing Document | IT lead | Excel |
| 5 | Technical Design Document | IT lead | Word |
| 6 | SIT QA Strategy | QA lead | Word |
| 7 | UAT QA Strategy | UAT lead | Word |
| — | RTM with T2BAU plan | Generated | Excel |
| — | Jira import: epics, stories and sub-tasks | Generated | Excel and CSV |

![The SDLC CAPM screen with the UAT QA Strategy waiting for the UAT lead's review](docs/images/screen-review.jpg)

*A deliverable waiting for its owner: the pipeline on the left, the draft with its guardrail checks in the middle, and approvals and traceability on the right.*

![The Export page listing the seven approved deliverables, the RTM and the Jira import, with their formats](docs/images/screen-export.jpg)

*The Export page: every deliverable with its version, approver and format, then the RTM and the Jira import generated from them.*

## Start here

| If you want to… | Read |
| --- | --- |
| Install it, run the sample and use it on a project | [docs/user-guide.md](docs/user-guide.md) |
| Understand how it is built | [docs/architecture.md](docs/architecture.md) |
| Change it with code: checks, steps, screens, a different AI | [docs/developing.md](docs/developing.md) |

## Quick start

```bash
npm install
```
```bash
npm run install-extension
```

Open this folder in VS Code, trust it, click **SDLC CAPM** in the status bar and click **Run pipeline** on the sample project. The full steps are in the [user guide](docs/user-guide.md#install-and-run-the-sample).

## Repository layout

| Folder | Holds |
| --- | --- |
| `content/` | Agents, step instructions, templates, rules and the NFR checklist: plain text anyone can edit |
| `projects/` | One folder per project: `project.yaml`, `inputs/` and `outputs/` |
| `packages/core` | The engine: steps, review gates, checks, versions, audit log, RTM, Word and Excel export |
| `packages/ui` | The review screen |
| `packages/vscode-extension` | Hosts the screen in VS Code and connects GitHub Copilot |
| `packages/cli` | The command line used by the Copilot Chat commands |

Tests: `npm test` runs the whole pipeline offline, with a stand-in for Copilot, and opens the Word and Excel files it produces to check them.
