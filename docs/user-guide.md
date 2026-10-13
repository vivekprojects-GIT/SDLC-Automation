# SDLC Automation Tool – User Guide

Last updated: 13 October 2026 · Source code: [github.com/vivekprojects-GIT/SDLC-Automation](https://github.com/vivekprojects-GIT/SDLC-Automation)

The SDLC Automation Tool turns a project's raw requirements (notes, call transcripts, legacy spreadsheets and Figma screens) into an approved PRD, BRD, test scenarios, test cases and Jira-ready epics and stories. GitHub Copilot writes each draft from your organisation's templates. Built-in checks catch gaps and invented content, and the named owner approves each document before the next step starts. It runs inside VS Code on your laptop, with nothing to host and no API key.

## How it works at a glance

Six documents are written in order. Each one stops at a review gate until its owner approves it, and only then does the next step start.

![The pipeline: inputs, six documents each behind a review gate, then the Jira and traceability export](images/diagram-pipeline.svg)

Each step reads only the approved documents before it, so a mistake caught at one gate never flows into the next.

### What runs where

Everything runs inside VS Code on your laptop. The only thing that leaves it is the request to GitHub Copilot, through your organisation's Copilot plan.

![Architecture: the screen, Copilot Chat and the command line all use the same core engine on the laptop; the extension sends requests to GitHub Copilot](images/diagram-architecture.svg)

- **Three ways in, one engine.** The SDLC Tool screen, the Copilot Chat commands and the command line all drive the same core engine, so the gates, checks and records are identical whichever you use.
- **Content is plain files.** Agents, step instructions, templates, rules and the NFR checklist live in `content/` and can be changed without code.
- **Records stay local.** Approvals, reviewer decisions and the audit log are kept in the project's `outputs` folder and are never sent to the AI. Copilot sees only what a step needs: the rules, the agent, the template, the inputs and the approved documents before it.

## What you need before you start

Four things on the laptop, plus one approval for real client work.

| Need | How to check |
| --- | --- |
| VS Code 1.95 or newer | Help → About |
| GitHub Copilot, signed in | The Accounts icon at the bottom left shows your GitHub account |
| Node.js 20 or newer | Run `node -v` in a terminal |
| Git | Run `git --version` in a terminal |
| Approval to send client documents through GitHub Copilot | Only needed before using real client material; the bundled sample is made-up data |

## Install and run the sample

About 15 minutes from a fresh clone to the first approved document.

**1. Get the code and install the tool**

```bash
git clone https://github.com/vivekprojects-GIT/SDLC-Automation.git sdlc-automation
cd sdlc-automation
npm install
npm run install-extension
```

`install-extension` builds the tool, packages it and installs it into VS Code. Run it again whenever you pull a newer version.

**2. Open the folder in VS Code**

1. **File → Open Folder** and choose the `sdlc-automation` folder.
2. If a yellow **Restricted Mode** bar appears, click **Manage** and choose **Trust**. VS Code switches Copilot off in untrusted folders, so the tool can't write documents until you do.

**3. Run the sample project**

1. Click **SDLC Tool** in the status bar at the bottom, or run **SDLC: Open SDLC Automation Tool** from the Command Palette.
2. Leave **Model** in the top bar on **Auto**.
3. Click **Run pipeline**. The first time, VS Code asks whether the extension may use Copilot: click **Allow**.
4. After about half a minute the intake summary appears. Answer any critical questions, then click **Approve**. The next step starts on its own.
5. Carry on through the PRD, BRD, test scenarios, test cases and stories, then click **Create export files**.

The sample, `projects/sample-commercial-loan`, is a made-up commercial loan migration, so it is safe to run as often as you like. To start it again, delete its `outputs` folder.

**4. Start your own project**

1. Copy `projects/sample-commercial-loan` to `projects/<your-project>`, then delete the copy's `inputs` and `outputs` folders.
2. In `project.yaml`, set the name, the type (`new-build`, `migration` or `enhancement`), the template pack and who owns each document.
3. Add your input files (next section).
4. Pick the project from the list in the tool's top bar and click **Run pipeline**.

**Updating and removing.** To update, run `git pull`, then `npm install` and `npm run install-extension`. To remove, open the Extensions view, find **SDLC Automation Tool** and click Uninstall; your projects are not touched.

## Giving inputs

Everything goes in the project's `inputs` folder. Add files with **Add files** in the tool, or copy them in yourself; the tool notices new files straight away.

| Kind | Formats | Where |
| --- | --- | --- |
| Requirement notes, specifications, emails | `.md`, `.txt`, `.docx` | `inputs/` |
| Meeting or call transcripts | `.txt`, `.md`, `.docx` | `inputs/` |
| Legacy data, current checklists | `.xlsx`, `.xls`, `.csv` | `inputs/` |
| Figma screens | `.png` or `.jpg` exports, or a short `.md` description of the frame | `inputs/figma/` |
| Other structured material | `.json`, `.yaml` | `inputs/` |

**Limits.** PDF is not read yet; save it as `.docx` or `.txt`. Only the first 200 rows of each spreadsheet sheet are read, so give a summary or a sample of very large files. Images in `inputs/figma/` are sent to Copilot again when test scenarios and stories are written; images elsewhere are read only at intake.

### Preparing inputs so the checks work well

Every requirement is traced back to a precise place in the inputs. A little structure makes that tracing exact.

1. **Number the sections of notes and specifications with §.** Copilot then cites "requirement-notes.md §2", and the tool can tell you if a whole section was never used.

```markdown
## §2 Policy rules
- DSCR at least 1.25x.
- LTV at most 75% when real estate is the collateral.

## §3 Exceptions
Above $5M a senior credit officer decides.
```

2. **Start each transcript line with a timestamp.** Copilot cites "transcript 12:40", and the tool flags any timestamp the intake never used.

```
[12:40] Credit lead: We should bring over three years of the old checklist.
[18:05] RM lead: RMs will not wait more than a few seconds for results.
```

3. **Give spreadsheets a header row and one record per row.**
4. **Export each Figma frame as its own image, named after the frame**, such as `exception-request.png`. Copilot reads the labels, fields and buttons on it.
5. **Write numbers exactly.** "At least 1.25x" and "$5M" are carried into the BRD and checked; "about a few seconds" becomes an open question.
6. **Use one topic per file and clear file names.** File names appear in every citation.

## How each document is created

Each step builds one document from the approved documents before it. A step starts only when every step before it is approved.

| Step | Built from | What it contains | Approved by (default) |
| --- | --- | --- | --- |
| 1. Intake and gaps | Every input file and Figma frame | A summary, key facts each with its source, and open questions with a severity and a suggested answer | Project manager |
| 2. PRD | The approved intake and its answers | The problem, users, features (F-01…) with sources, success measures, scope, assumptions | Product owner |
| 3. BRD | The approved intake and PRD | Business objectives, stakeholders, functional (FR-01…) and non-functional (NFR-01…) requirements with sources and priority | Business analyst |
| 4. Test scenarios | The approved BRD and the Figma frames | One scenario per situation (TS-01…), each naming the requirements and screen it covers | QA lead |
| 5. Test cases | The approved BRD and scenarios | Positive, negative and edge cases (TC-01…) with steps, test data, expected result and coverage | QA lead |
| 6. Epics and stories | The approved BRD and the Figma frames | Epics (EP-01…) and stories (US-01…) with "As a …, I want …, so that …", acceptance criteria, sub-tasks and points | Scrum master |

### Who writes them: the agents

An agent is not a program that makes decisions. It is four plain text files that the tool combines into one request to Copilot:

| Part | File | For example |
| --- | --- | --- |
| Who the agent is | `content/agents/<agent>.md` | "You are an experienced business analyst…" |
| What this step must do | `content/stages/<step>.md` | "Copy limits and numbers exactly." |
| The shape of the document | `content/templates/<pack>/<step>.md` | The BRD's headings and table columns |
| Rules every agent follows | `content/rules.md` | "Never invent numbers. Cite the source of every fact." |

Four agents write the documents: the business analyst (intake, BRD), the product manager (PRD), the QA lead (test scenarios, test cases) and the scrum master (stories). The tool adds the project details and the approved documents, sends everything to Copilot, saves the reply as a draft, then runs the checks. An agent never approves a document or starts the next step.

### Step by step

- **Intake** reads everything and writes down only what the inputs say, each fact with its source. Conflicts and gaps become open questions, for example two sources disagreeing on an approval threshold, or no retention period given. Critical questions must be answered before the intake can be approved, and the answers then feed every later step.
- **PRD** explains the product from the user's side: the problem, who has it, the features that solve it and how success is measured.
- **BRD** turns that into numbered, testable requirements, copying limits and values exactly. Anything not traceable to an input, the PRD or an intake answer is marked ASSUMPTION for a reviewer to decide.
- **Test scenarios** give every functional requirement at least one situation to test, including failures and rejections, tied to the Figma screen it runs through.
- **Test cases** give each scenario positive, negative and edge cases, for example the exact threshold value and the value just past it, with concrete data and a checkable result.
- **Epics and stories** group requirements into epics and write sprint-sized stories, each with Given/When/Then acceptance criteria, sub-tasks and a points estimate. Every requirement must be covered by a story.

## Reviewing and approving

Every draft waits for its owner. The checks run first, then the owner approves it, sends it back or edits it.

![The life of one document at its review gate: ready, writing, checks, needs review, approved, with send back, edit and reopen loops](images/diagram-review-gate.svg)

The owner has these choices:

| Action | What happens |
| --- | --- |
| **Approve** | The document becomes v1.0, with the approver's name and time recorded, and the next step starts. Refused while any check blocks. |
| **Send back** | The agent revises the draft (v0.2, v0.3…) and it returns for review. |
| **Ask the agent to fix this** | One click on a failed check sends the draft back with the right comment already written. |
| **Edit file** | Opens the Markdown file. Change it directly; when you save, the tool records the edit and runs the checks again. |
| **Keep / Remove / Waive** | Settles a flagged item: keep or remove a requirement with no source, or waive a checklist topic or intake fact that doesn't apply. |
| **Use suggestion** | Fills an intake question with the answer the inputs point to. |
| **Reopen for changes** | Reopens an approved document. Every later step is marked out of date and must be written and approved again. |

### Reading the screen

The screen has four areas. On a narrow window the right-hand panels move below the document.

![The SDLC Tool screen with the stories draft waiting for the Scrum master's review](images/screen-review.jpg)

*A draft waiting for review: the pipeline on the left, the document record in the middle with the review bar at the bottom, and Approvals and Traceability on the right.*

| Area | What it shows |
| --- | --- |
| Top bar | The project, the AI connection (GitHub Copilot), the **Model** picker and your reviewer name |
| Pipeline (left) | Every step in order, from **Inputs** to **Export**. A green tick means approved, a spinner means the agent is writing, a number in an amber ring is waiting for review, and a grey number has not started. Click a step to open it. |
| Document (middle) | The step's record: **Status**, **Version**, **Owner**, **Written by** and **Approved** (who and when), then the guardrail checks and the draft. The review bar with the action buttons stays at the bottom while you scroll. |
| Governance (right) | **Approvals**, **Traceability** and the **Audit log**, described below |

Each step's status is shown as a label:

| Label | Meaning |
| --- | --- |
| READY TO RUN | The steps before it are approved, so it can be written now |
| WRITING | The agent is writing the draft |
| NEEDS REVIEW | A draft is waiting for its owner |
| APPROVED | The owner approved it; it is now v1.0 or later |
| OUT OF DATE | An earlier document was reopened, so this one must be written and approved again |
| WAITING | It starts after the step before it is approved |

**Guardrail checks.** The card opens with a build-style summary, such as **4 passed · 1 warning · 0 blocking**. Each check is marked with a green tick (passed), an amber triangle (warning) or a red cross (blocks approval). Where a check can be fixed or decided, its buttons sit under it.

![Guardrail checks on the intake summary: 3 passed, 6 warnings, 0 blocking](images/screen-checks.jpg)

*The intake summary's checks, with its open questions underneath. Unanswered normal questions are warnings; critical ones block approval until answered.*

**Approvals.** A progress bar shows how many of the six documents are approved, as a count and a percentage. Under it, each step lists its owner role, and either who approved it and when, or its status.

**Traceability.** The headline is the share of functional requirements that are **fully traced**: each has a scenario, a test case and a story. It appears once all three kinds of document are written. Below it, one bar each for test scenarios, test cases and stories shows how many requirements they cover, such as **16 / 19 · 84%**. The bar turns green at 100%. The requirement IDs a document still misses are listed under its bar, for example **Not covered: FR-07 FR-12 FR-18**.

![The Approvals and Traceability panels for a finished project](images/screen-governance.jpg)

*A finished project: all six documents approved and all 19 functional requirements fully traced.*

**Audit log.** Every action, by people and by agents, newest first, with the time and the version. The same log is saved in `outputs/audit-log.csv` and is never sent to the AI.

## Quality checks

The checks are written in code, not left to the AI, so they behave the same on every run. They run on every draft and again whenever it changes. A **block** stops approval until it is fixed or decided; a **warning** is shown but does not stop it.

| Step | Check | Level |
| --- | --- | --- |
| All | Every section of the template is present and filled | Block |
| All | Every ID (FR-01, TC-03…) is used only once | Block |
| All | Numbers that look like card or national ID numbers | Warning |
| Intake | Every input file is used | Block |
| Intake | Every numbered section (§2) and transcript timestamp (12:40) is used | Warning |
| Intake | Every critical open question is answered | Block |
| PRD, BRD | Every feature and requirement cites a real source: an input file, an approved document or an answered intake question. One backed only by ASSUMPTION or an unanswered question must be kept or removed | Block |
| BRD | Security, personal data, retention, accessibility, audit and performance are covered (or waived) | Block |
| BRD | Every key fact from the intake reaches the BRD (or is waived as context) | Block |
| BRD | The values in those facts, such as 1.25x or $10M, appear in the BRD | Warning |
| Test scenarios | Every requirement has a scenario | Block |
| Test cases | Every requirement has a test case | Block |
| Test cases | Positive, negative and edge cases are all present | Warning |
| Stories | Every story has the user-story sentence and Given/When/Then criteria | Block |
| Stories | Every requirement has a story | Block |
| Stories | A story that covers no requirement, or has no points | Warning |

What no check can find is a requirement that appears nowhere in the inputs. That is why a person approves every document.

## Outputs and exports

Everything is written to the project's `outputs` folder. The documents appear as each step runs; the export files appear when you click **Create export files** after every step is approved.

![The Export step listing the approved documents and the export files](images/screen-export.jpg)

*The Export step: every approved document with its version and approver, and the files it created.*

| File | Contents | When |
| --- | --- | --- |
| `00-intake.md` | Summary, key facts with sources, open questions and their answers | Step 1 |
| `01-prd.md` | Product Requirements Document | Step 2 |
| `02-brd.md` | Business Requirements Document | Step 3 |
| `03-test-scenarios.md` | Test scenarios linked to requirements and screens | Step 4 |
| `04-test-cases.md` | Test cases with data, expected results and coverage | Step 5 |
| `05-stories.md` | Epics, user stories, acceptance criteria, sub-tasks, points | Step 6 |
| `jira-import.csv` | Every epic, story and sub-task, ready for Jira's CSV importer | Export |
| `traceability.md`, `traceability.csv` | Every requirement mapped to its source, scenarios, test cases and stories | Export |
| `audit-log.csv` | Every action, by people and agents, with time, version and AI model | Always |
| `pipeline-state.json` | Where each step stands; managed by the tool, do not edit | Always |

Each document starts with a header giving its version, status, owner, template, the agent and model that wrote it, and who approved it and when. The documents are Markdown, so they open in VS Code, render on GitHub and paste into Confluence.

### The Jira import file

One row per epic, story and sub-task, with these columns:

| Column | Holds |
| --- | --- |
| Issue Id | EP-01, US-01, or US-01-T1 for a sub-task |
| Parent Id | The epic for a story; the story for a sub-task |
| Issue Type | Epic, Story or Sub-task |
| Summary | The epic name, story title or sub-task |
| Description | The user-story sentence and its Figma screen |
| Acceptance Criteria | One criterion per line |
| Story Points | The story's estimate |
| Labels | `sdlc-automation` and the requirement IDs the story covers |

To load it: in Jira, go to **System → External system import → CSV** and choose `jira-import.csv`. Map **Issue Id** and **Parent Id** so stories sit under their epics and sub-tasks under their stories. If your Jira keeps acceptance criteria in a custom field, map the Acceptance Criteria column to it.

### The traceability matrix

One row per functional requirement: its text, where it came from, and the scenarios, test cases and stories that cover it. Requirements a reviewer removed are struck through. It is the quickest way to show an auditor or a client that nothing was lost between the requirements and the backlog.

## Customising without code

Everything here is a plain text file. A PM, BA or QA lead can change it in VS Code without a developer or a rebuild. New drafts use the change at once; drafts already in review are re-checked the next time the tool opens.

| To change | Edit |
| --- | --- |
| The shape of a document | `content/templates/<pack>/<step>.md` |
| How an agent thinks and writes | `content/agents/<agent>.md` |
| What a step must do | `content/stages/<step>.md` |
| Rules every agent follows | `content/rules.md` |
| Topics every BRD must cover | `content/checklists/nfr.md` |
| A project's owners, step order, templates and limits | `projects/<project>/project.yaml` |

### Add your organisation's templates

1. Create a folder beside the standard set, named after your organisation: `content/templates/acme/`.
2. Copy in only the templates you want to change from `content/templates/standard/`: any of `intake.md`, `prd.md`, `brd.md`, `test-scenarios.md`, `test-cases.md` and `stories.md`. Edit them. Any you leave out fall back to the standard set.
3. In the project's `project.yaml`, set `templatePack: acme`.
4. Run the pipeline. Try a new set on the sample project first.

An example custom BRD:

```markdown
# Business Requirements Document: {{project}}

## Document control
<!-- version, date, author, reviewers -->

## Business objectives
| ID | Objective | Success measure |
| --- | --- | --- |
<!-- BO-01 onwards -->

## Functional requirements
| ID | Requirement | Business rule | Source | Priority |
| --- | --- | --- | --- | --- |
<!-- FR-01 onwards; one testable behaviour per row -->

## Non-functional requirements
| ID | Requirement | Source |
| --- | --- | --- |

## Sign-off
<!-- the roles that must approve this document -->
```

**Rules a template must follow, because the checks read the documents:**

- Every `## heading` becomes a required section. Headings with placeholders, such as `## EP-01 <Epic name>`, are not required.
- Text inside `<!-- … -->` is guidance for the agent; it does not count as content. `{{project}}` becomes the project name.
- **Requirement tables** (PRD features, BRD requirements): the ID is the first column, and there must be a `Source` column. Other columns are up to you.
- **Intake:** keep a `## Key facts` section of bullets, each ending with its source in brackets, and the open-questions table with a column containing "Question", a `Severity` column and a column headed exactly `Answer`. Question IDs look like `Q1`.
- **Test cases:** keep a `Type` column (Positive, Negative, Edge), and have each row name the FR or TS IDs it covers; a `Covers` column is easiest.
- **Stories:** epics as `## EP-01 Name`, stories as `### US-01 Title`, lines starting `Covers:`, `Figma:` and `Points:`, and bold **Acceptance criteria** and **Sub-tasks** labels.

Word templates are not read directly. Copy a Word template's headings and table columns into a Markdown template once.

### Change an agent or a step

- **Agents:** describe in a short paragraph who the agent is and what it cares about. Keep step-specific detail out.
- **Steps:** each file in `content/stages/` is a short list of instructions, for example "Include one accessibility test for every screen." Instructions guide the AI. If a rule must be guaranteed, add a check (next section).

### Change the mandatory BRD topics

Each line of `content/checklists/nfr.md` is a topic, then the words that count as covering it:

```
- Accessibility: accessibility, wcag, screen reader
```

Add a line for a new topic, or add words to an existing one.

### Project settings

```yaml
name: Commercial Loan Policy Check
type: migration            # new-build | migration | enhancement
templatePack: standard
stageOrder: [intake, prd, brd, test-scenarios, test-cases, stories]
owners:
  intake: Project manager
  prd: Product owner
  brd: Business analyst
  test-scenarios: QA lead
  test-cases: QA lead
  stories: Scrum master
budget:                    # all optional
  # maxInputTokens: 60000  # cap one request below the model's own limit
  # maxOutputTokens: 8000  # how long one reply can safely be (the default)
  # chunkSize: 10          # fix the piece size for long documents
```

- **owners** are the role names shown on the Approve button and in the audit log.
- **stageOrder** must start with `intake`. To write the BRD before the PRD, swap them.
- **budget** can be left out; the tool sizes requests from the chosen model.

In VS Code Settings (search "SDLC") you can also set **Reviewer name** (your name in approvals and the audit log) and **Auto advance** (start the next step after an approval).

## Extending with code

For changes a text file can't make. The code is TypeScript in four separate packages, so a change in one rarely touches the others.

| Package | Job |
| --- | --- |
| `packages/core` | The engine: steps, review gates, checks, versions, audit log, traceability, export. No screen or VS Code code. |
| `packages/ui` | The screens. No workflow logic; they send and receive the messages defined in `packages/ui/src/messages.ts`. |
| `packages/vscode-extension` | Hosts the screens in VS Code and connects GitHub Copilot. |
| `packages/cli` | The command line used by the Copilot Chat commands. |

To work on it: `npm install`, then `npm test` (the whole pipeline runs offline, with sample replies in place of Copilot) and `npm run typecheck`. Press **F5** in VS Code to open a second window running your changes.

### Add a check

1. Write a function in `packages/core/src/guardrails/checks.ts` (or a new file beside it) that returns check results. Each result has:
   - `level`: `block` stops approval, `warn` only shows;
   - `message`: what is wrong, in plain words;
   - optionally `fix`: a send-back comment, which adds the **Ask the agent to fix this** button;
   - optionally `itemId` and `options` (`keep`, `remove`, `waive`): lets the reviewer settle it.
2. Call it for the right step in `runChecks` at the end of `checks.ts`. If it needs another document, add it to the check input and load it in `Pipeline.check()`.
3. Add a test in `packages/core/test/`.

For example, a check that every BRD requirement names its owning system would read the BRD's requirement rows, look for a filled `System` column, and block with a fix such as "Name the owning system for FR-04 and FR-07."

### Add Jira fields or a new export

- **Jira columns:** `toJiraCsv` in `packages/core/src/export/jira.ts` writes the header row and each epic, story and sub-task row. Add the column to the header and its value to each row, for example a `Components` column filled from a `Component:` line in each story. If the value comes from the story text, read it in `parseStories` in the same file, and add the line to the stories template so the agent writes it.
- **A new export file**, such as a Confluence page or a test-management CSV: write a function in `packages/core/src/export/` that turns the approved documents into the file. Call it from `exportAll` in `packages/core/src/pipeline/pipeline.ts`, and add its file name to `EXPORT_FILES` in the same file so the screen lists it.

### Add a step

1. In `packages/core/src/stages/registry.ts`, add the step's key and its entry: title, agent, file name and which approved documents it reads.
2. Write `content/stages/<file>.md` and `content/templates/standard/<file>.md`, plus an agent in `content/agents/` if a new one is needed.
3. Add a sample reply for the tests in `packages/core/test/support/sample-outputs.ts`.
4. Add the step's checks to `runChecks`.
5. Add the key to `stageOrder` in each project's `project.yaml`.

The screen, the command line and the audit log pick up a new step automatically.

### Use a different AI

The engine talks to an AI only through the `LlmProvider` interface in `packages/core/src/llm/provider.ts`: a `name` and a `complete` method, plus optional `describeModel` and `contextLimit`. `CopilotProvider` in `packages/vscode-extension/src/copilot-provider.ts` is the example to follow.

### Release a new version

Bump `version` in `packages/vscode-extension/package.json`, run `npm test` and `npm run typecheck`, then `npm run package-extension`. Share the `.vsix` it creates, or ask people to pull and run `npm run install-extension`.

## Using Copilot Chat instead of the screen

People who already work in Copilot Chat can drive the same pipeline from there. Both routes use the same engine, so the review gates, checks, versions and audit log are identical.

| In Copilot Chat (agent mode) | What happens |
| --- | --- |
| `/sdlc-next` | Copilot finds the next step that is ready, writes its document from the step's full instructions, registers it, shows the checks, and stops for review |
| `/sdlc-revise` | Copilot revises a document from your comment, then stops for review |
| `/sdlc-status` | A plain-words summary of where every project stands and who needs to act |

The commands are defined in `.github/prompts/`. Copilot is told never to approve, answer intake questions or settle flagged items itself. Approvals stay with people, in the screen or from a terminal:

```bash
npm run sdlc -- approve brd --as "Your Name"
```

Run `npm run sdlc -- help` for every command.

## AI models, long documents and records

**Choosing the model.** The **Model** list in the tool's top bar shows the GitHub Copilot models your account offers. **Auto** picks the most capable model that Copilot lets extensions use. If a model is refused, it moves on to the next. Which models appear, and which extensions may use, depends on each person's Copilot plan and organisation policy.

**Request size.** Each step sends only what it needs: the approved documents before it, plus the input files for the intake. Requests stay within the chosen model's limit. Oversized input files are trimmed at intake, with a warning to the reviewer.

**Long documents.** When test cases or stories would be too long for one reply, they are written in natural pieces and joined: test cases a group of scenarios at a time, and stories as a short epic plan, then a few epics at a time. Summary counts are recalculated after joining.

**Automatic gap filling.** After writing, the tool checks that every requirement has its scenario, test case or story. A reply that stopped mid-table has its broken row dropped. Up to two more requests then write only the missing items, before the reviewer sees the draft. Anything still missing is left to the checks and the reviewer.

**Records kept for every project:**

- each document's header, with its version, owner, the agent and model that wrote it, and who approved it and when;
- `audit-log.csv`, recording every action: generated, revised, edited, approved, reopened, items kept, removed or waived, and exports. It includes the model used and whether a document was written in pieces or gap-filled. It is never sent to the AI;
- the traceability matrix, from each requirement back to its source and forward to its tests and stories.

**Data handling.** Input files and approved documents go only to GitHub Copilot, through VS Code. Everything else stays in the project folder on your laptop. Before using a client's real documents, get approval to send them through Copilot.

## Troubleshooting

| You see | Do this |
| --- | --- |
| "Copilot is turned off because this folder is in Restricted Mode" | Click **Manage** in the yellow bar and choose **Trust** |
| "No GitHub Copilot model is available" | Sign in to GitHub Copilot from the Accounts icon, then try again |
| "VS Code did not allow this extension to use Copilot" | Run the step again and click **Allow** |
| "…does not let extensions use it" | Pick another model, or **Auto**, in the top bar |
| "Another step is still running" | Wait for it to finish; one step runs at a time |
| "…needs about N tokens of input, more than the … allowed" | Pick a model with a larger context, or split the largest input file |
| No **SDLC Tool** button in the status bar | Open the repository's root folder, the one with `content/` and `projects/` |
| A PDF is listed as "not supported" | Save it as `.docx` or `.txt` |
| A draft keeps the same blocking check | Click **Ask the agent to fix this**, or edit the file directly and save |

## Limits and common questions

**What it does not do yet**

- Design, code, testing or release: it stops at the backlog.
- Word documents in your organisation's style; documents are Markdown today.
- PDF inputs, or a live connection to Figma (it reads exported frames).
- Authenticated approvals. The approver is the name in settings; for a hard stop, approve through pull requests with named reviewers.
- Different handling per project type. The type is passed to the agents, but a fix or enhancement still gets full documents rather than changes only.
- Two people working in the same project folder at the same time.

**Does the AI decide what goes into the requirements?** No. It writes drafts. A named person approves every document, and the audit log records who approved what. Anything the AI cannot trace to a source is flagged for a person to keep or remove.

**What if Copilot gets something wrong?** It sometimes will: invent a feature, skip a requirement or leave out a limit. The checks catch these and block approval until someone deals with them. They can't find a requirement that is in none of the inputs, which is why the reviewer matters.

**What does it cost?** Nothing beyond the GitHub Copilot licence you already have. There is no server and no API key.

**Can it follow our templates?** Yes. See *Add your organisation's templates* above.

**Where is a complete example?** Run the sample project end to end, or open the `outputs` folder of any finished project.
