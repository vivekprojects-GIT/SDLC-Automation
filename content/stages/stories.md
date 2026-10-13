## Task

Write the backlog: epics that group related requirements, and user stories a team can deliver within a sprint, ready to load into Jira.

## What you have

- The approved BRD and intake summary.
- The project's Figma frames, as images or text descriptions.

## How to work

1. Group the functional requirements into epics around a business capability (EP-01 onwards). Each requirement belongs to exactly one epic.
2. Within each epic, write stories (US-01 onwards) that deliver its requirements. Split a story by workflow step, business rule, data variation or screen if it would be larger than 8 points.
3. For each story write, in this order:
   - the sentence "As a <role>, I want <goal>, so that <benefit>.";
   - `Covers:` the FR IDs it delivers;
   - `Figma:` the frame it uses, or `—`;
   - `Points:` 1, 2, 3, 5 or 8;
   - a bold **Acceptance criteria** label with Given/When/Then bullets using the exact values from the requirements;
   - a bold **Sub-tasks** label with the build tasks as bullets.
4. Check your draft against the quality bar below, then write the document.

## What each section must contain

- **Summary:** the number of epics, stories and total story points.
- One `## EP-xx Name` section per epic, with a one-line goal, then its `### US-xx Title` stories.

## Quality bar

Before you answer, confirm that:
- every functional requirement appears in the Covers line of at least one story;
- every story covers at least one requirement;
- every story has acceptance criteria in Given/When/Then form and at least one sub-task;
- no story is estimated above 8 points;
- the summary counts match the epics and stories.

## Example (format only; do not reuse its content)

```markdown
## EP-01 Order approvals
Make sure large orders are approved before they ship.

### US-01 Hold large orders for approval
As a sales manager, I want orders over $2,000 held for my approval, so that large orders are checked before they ship.
Covers: FR-01
Figma: Approval request
Points: 5

**Acceptance criteria**
- Given an order of $2,000.01, when it is submitted, then it is held and an approval request is sent to the manager.
- Given an order of $2,000.00, when it is submitted, then it ships without approval.

**Sub-tasks**
- Add the approval threshold check
- Build the approval request screen
```
