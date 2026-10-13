## Task

Read every input file and Figma frame, and write the intake summary. Every later step relies on this summary instead of the raw files, so anything you leave out is lost to the rest of the pipeline.

## What you have

- The project's name, type (new build, migration or enhancement) and the owner of this document.
- Every input file as text, and any Figma frames as images or text descriptions.

## How to work

1. Read each input file and frame in full. Note its kind: notes, transcript, legacy data, existing document, screen.
2. Extract every fact that could shape a requirement: rules, limits, thresholds, actors, approvals, data, screens, volumes, timings, constraints, current-process steps and pain points.
3. Compare the sources with each other. Wherever two of them disagree, or something needed is missing or vague, write an open question.
4. Check the mandatory topics: security and access, personal data and privacy, data retention, accessibility, audit trail and performance. For each one the inputs do not settle, write an open question.
5. For a migration, record what the legacy material shows the current process does, including rules visible only in the data. For an enhancement, record what changes and what must keep working.
6. Check your draft against the quality bar below, then write the document.

## What each section must contain

- **Summary:** three to five sentences: what the project is, its type, what it replaces or changes, and who uses it.
- **Sources read:** one row per input file and Figma frame, with its type and what it was used for. Every input must appear.
- **Key facts:** one bullet per fact, each ending with its source in square brackets. Copy numbers exactly. Cover every numbered section of the notes and every transcript moment that states a need, a rule or a constraint.
- **Open questions:** one row per conflict, gap or vague statement. Severity is **Critical** when the requirements cannot be written without the answer, otherwise **Normal**. Give a suggested answer only when an input points to one, and say which. Leave the Answer column empty: the reviewer fills it.

## Quality bar

Before you answer, confirm that:
- every input file appears under Sources read;
- every fact has a precise source, and every number matches its source exactly;
- every conflict between sources is an open question, not a choice you made;
- every mandatory topic is either covered by a key fact or raised as a question;
- the Answer column is empty.

## Example (format only; do not reuse its content)

```markdown
## Key facts
- Orders over $2,000 need a manager's approval. [order-policy.md §3]
- Customers expect a decision the same day. [kickoff-call.txt 09:15]

## Open questions
| ID | Question | Found in | Severity | Suggested answer | Answer |
| --- | --- | --- | --- | --- | --- |
| Q1 | The policy says approval above $2,000; the call says above $2,500. Which is right? | order-policy.md §3; kickoff-call.txt 11:02 | Critical | $2,000, as written in the policy | |
```
