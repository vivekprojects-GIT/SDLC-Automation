# How it works

## The problem it solves

At the start of every project, PMs, BAs and QA leads write the same documents by hand: a PRD, a BRD, test cases and Jira stories. It takes days, every team uses a different format, and things slip between documents. A requirement ends up with no test, or a screen with no story.

This tool has GitHub Copilot write the drafts from the project's raw material. The people who own each document review and approve it, and code checks every draft before anyone can approve it.

## The steps

```
Inputs → 1 Intake and gaps → 2 PRD → 3 BRD → 4 Test scenarios → 5 Test cases → 6 Epics and stories → Export
```

| Step | Reads | Writes | Approved by (default) |
| --- | --- | --- | --- |
| 1 Intake and gaps | Every input file and Figma frame | A summary, key facts with sources, and open questions | Project manager |
| 2 PRD | The approved intake | What is built and why: users, features, measures, scope | Product owner |
| 3 BRD | The approved intake and PRD | Business objectives, stakeholders, numbered functional and non-functional requirements | Business analyst |
| 4 Test scenarios | The approved BRD and Figma frames | One scenario per situation, each naming the requirements it covers | QA lead |
| 5 Test cases | The approved BRD and scenarios | Positive, negative and edge cases with data and expected results | QA lead |
| 6 Epics and stories | The approved BRD and Figma frames | Epics, user stories, acceptance criteria, sub-tasks, points | Scrum master |
| Export | All approved documents | `jira-import.csv`, `traceability.md` and `traceability.csv` | — |

A step only starts when every step before it is approved. With **Start the next step automatically** on (the default), approving one step starts the next.

## What the reviewer can do

- **Approve.** The document becomes v1.0 and the approver's name and time are recorded. Refused while any check blocks.
- **Send back with a comment.** The agent revises the draft (v0.2, v0.3…) and it comes back for review.
- **Ask the agent to fix this.** One click on a failed check sends it back with the right comment already written.
- **Edit file.** Change the Markdown file directly; the tool notices when you save and runs the checks again.
- **Keep, remove or waive** an item a check flagged.
- **Reopen** an approved document. Every later step is marked out of date and must be approved again.

## What an agent is

An agent is not a program that makes decisions. It is four plain text files that the tool combines into one request to Copilot:

| Part | File | Example |
| --- | --- | --- |
| Who it is | `content/agents/<agent>.md` | "You are an experienced business analyst…" |
| What this step must do | `content/stages/<step>.md` | "Copy limits and numbers exactly." |
| The shape of the output | `content/templates/<pack>/<step>.md` | The BRD's headings and table columns |
| Rules every agent follows | `content/rules.md` | "Never invent numbers. Cite the source of every fact." |

The tool adds the project details and the approved documents from earlier steps, sends it all to Copilot, and saves the reply as a draft. Code then checks the draft. The agent never approves anything and never starts the next step.

Four agents write the documents: business analyst (intake, BRD), product manager (PRD), QA lead (scenarios, test cases) and scrum master (stories). A compliance-reviewer persona exists in `content/agents/` but is not used by any step. Compliance is enforced by the code checks below.

## The checks

These run on every draft, and again whenever it changes. **Blocks** stop approval. **Warnings** are shown but do not stop it.

| Step | Check | Level |
| --- | --- | --- |
| All | Every section of the template is present and filled | Block |
| All | Every ID (FR-01, TC-03…) is used once | Block |
| All | Numbers that look like card or national ID numbers | Warning |
| Intake | Every input file is used | Block |
| Intake | Every numbered section (§2) and transcript timestamp (12:40) is used | Warning |
| Intake | Every critical question is answered | Block |
| PRD, BRD | Every feature or requirement cites a source; ASSUMPTION or no source needs keep or remove | Block |
| BRD | Security, personal data, retention, accessibility, audit and performance are covered (`content/checklists/nfr.md`), or waived | Block |
| BRD | Every key fact from the intake reaches the BRD, or is waived as context | Block |
| BRD | The values in those facts (1.25x, $10M) appear in the BRD | Warning |
| Test scenarios | Every requirement has a scenario | Block |
| Test cases | Every requirement has a test case | Block |
| Test cases | Positive, negative and edge cases are all present | Warning |
| Stories | Every story has the user-story sentence and Given/When/Then criteria | Block |
| Stories | Every requirement has a story | Block |
| Stories | A story covers no requirement, or has no points | Warning |

## Governance records

Everything lives in the project's `outputs/` folder:

- **The documents**, each with a header saying its version, status, owner, template, which agent and model wrote it, and who approved it.
- **`audit-log.csv`**: every action, with time, step, who (person, or agent and model), version and details. Never sent to the AI.
- **`pipeline-state.json`**: where each step stands. Managed by the tool; do not edit it.

## Two ways to drive it

- **The SDLC Tool screen.** Buttons and checks, for anyone.
- **Copilot Chat:** `/sdlc-next`, `/sdlc-revise`, `/sdlc-status`, defined in `.github/prompts/`. Copilot writes the document, and the command line tool versions, checks and logs it. Approvals stay with people: `npm run sdlc -- approve <step> --as "<name>"`.

Both go through the same engine, so the gates and checks are identical.

## Choosing the AI model

The **Model** list in the top bar shows the Copilot models your account offers. **Auto** picks the most capable one extensions may use, and moves on to the next if a model is refused. Requests are kept below the chosen model's input limit. The audit log records which model wrote each draft, and how many Figma images went with it.

## Large inputs

Each step sends Copilot only what it needs: the approved documents before it, and for the intake the input files. Nothing builds up across steps.

- **Request size** follows the chosen model: up to 80% of its input limit (and at most 128k tokens, as very long prompts make models follow templates less well). Oversized input files are trimmed at intake, with a warning.
- **Long documents are written in natural pieces** when one reply would be too long (about 8,000 tokens) or one request too big. Test cases go a group of scenarios at a time. Stories start with a short epic plan, then are written a few epics at a time. The pieces are joined and the summary counts are recalculated.
- **Gaps are filled automatically.** After writing, the tool checks that every requirement has a scenario, test case or story. If a reply was cut off mid-table, the broken row is dropped. Up to two more requests then write only the missing items, before the reviewer sees the draft. Each automatic fill is noted in the history and the audit log. Anything still missing is left to the coverage check and the reviewer.

The `budget` settings in `project.yaml` are optional overrides; see [customising.md](customising.md).

## What it does not do (yet)

- Design, code, testing or release: it stops at the backlog.
- Word documents in the organisation's style.
- PDF inputs, or a live connection to Figma (it reads exported frames).
- Authenticated approvals. The approver is the name in settings; for a hard stop, approve through pull requests with named reviewers.
- More than one person working on the same project folder at once.
