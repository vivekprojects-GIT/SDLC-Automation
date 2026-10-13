# Customising without code

Everything on this page is a plain text file. A PM, BA or QA lead can change it in VS Code; no build is needed. Drafts in review are re-checked the next time the tool opens, and new drafts use your changes straight away.

| To change | Edit |
| --- | --- |
| How an agent thinks and writes | `content/agents/<agent>.md` |
| What a step must do | `content/stages/<step>.md` |
| The shape of a document | `content/templates/<pack>/<step>.md` |
| Rules for every agent | `content/rules.md` |
| Topics every BRD must cover | `content/checklists/nfr.md` |
| A project's owners, step order, template pack and limits | `projects/<project>/project.yaml` |

## Change an agent

Open the agent's file, for example `content/agents/qa-lead.md`, and describe who it is and what it cares about in plain sentences. Keep it short: a paragraph is enough. Step-specific detail belongs in `content/stages/`.

## Change what a step does

Each file in `content/stages/` is a short list of instructions for one step. Examples:

- In `test-cases.md`, add "Include one accessibility test for every screen."
- In `brd.md`, add "Every requirement must name the system that owns it."

If the instruction should also be enforced, ask a developer to add a check (see [developing.md](developing.md)). Instructions guide the AI; checks guarantee the result.

## Use your organisation's templates

1. Create `content/templates/<org>/`, for example `content/templates/acme/`.
2. Copy in only the templates you want to change from `content/templates/standard/`, and edit them. Any template you leave out falls back to `standard`.
3. Set `templatePack: acme` in the project's `project.yaml`.

Rules the checks rely on:

- Every `## heading` in a template becomes a required section. Headings containing `<` or `{` (placeholders, such as `## EP-01 <Epic name>`) are not required.
- Requirement tables need an `ID` column first and a `Source` column.
- Test-case tables need a `Type` column (Positive, Negative, Edge) and a `Covers` column.
- Stories need lines starting `Covers:`, `Figma:` and `Points:`, and bold **Acceptance criteria** and **Sub-tasks** labels.
- `{{project}}` is replaced with the project name.
- Text inside `<!-- -->` is guidance for the agent and does not count as content.

## Change the mandatory checklist

Each line of `content/checklists/nfr.md` is one topic, then the words that count as covering it:

```
- Accessibility: accessibility, wcag, screen reader
```

Add a line for a new topic, or add words to an existing one. A BRD cannot be approved until every topic is covered or waived.

## Set up a project

`projects/<project>/project.yaml`:

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
  maxInputTokens: 60000    # cap one request below the model's own limit
  maxOutputTokens: 8000    # how long one reply can safely be (the default)
  chunkSize: 10            # fix the piece size: scenarios per piece for test cases, requirements for stories
```

- **Owners** are the role names shown on the Approve button and in the audit log.
- **stageOrder** must start with `intake`. To write the BRD before the PRD, swap them; each step reads whichever approved documents come before it.
- **Budget:** leave it out and the tool sizes everything from the chosen model. Set `maxInputTokens` to keep requests smaller on purpose, `maxOutputTokens` if a model's replies get cut short often, or `chunkSize` to fix how much goes into each piece.

## Settings

VS Code Settings → search "SDLC":

| Setting | Meaning |
| --- | --- |
| Model | Set from the tool's top bar; empty means Auto |
| Reviewer name | Your name in approvals and the audit log (defaults to your computer user name) |
| Auto advance | Start the next step automatically after an approval |
