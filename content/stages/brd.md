## Task

Write the Business Requirements Document: the business objectives, scope and stakeholders, and the numbered functional and non-functional requirements that design, testing and the backlog will be built from.

## What you have

- The approved intake summary, with its key facts and the reviewer's answers.
- The approved PRD.

## How to work

1. Write the business objectives (BO-01 onwards) from the PRD's problem and success measures, each with how it will be measured.
2. Set the scope from the PRD: what is in, what is out.
3. List the stakeholders, what they care about and their role in the project.
4. Write the functional requirements (FR-01 onwards). Go through **every key fact** in the intake: each fact that describes a behaviour, rule or limit becomes at least one requirement. Then check each PRD feature is covered.
5. Write the non-functional requirements (NFR-01 onwards). Cover security and access, personal data and privacy, data retention, accessibility, audit trail and performance. If the material does not settle one, add it with ASSUMPTION as the source so the reviewer decides.
6. Give each requirement a priority: Must, Should or Could.
7. Check your draft against the quality bar below, then write the document.

## How to write each requirement

- One testable behaviour per row, written as "The system must …".
- State the condition, the behaviour and the exact values: "The system must route the application to a senior credit officer when the loan amount is above $5M."
- Copy every limit, threshold, amount, period and unit exactly from its source. A requirement that refers to "the policy limit" instead of the actual value is not testable.
- Cite the source: the input file and locator, the PRD feature, or the intake answer. If none applies, the source is ASSUMPTION.

## Quality bar

Before you answer, confirm that:
- every key fact from the intake that describes a behaviour, rule or limit is covered by a requirement;
- every PRD feature is covered;
- every requirement states its exact values, not a reference to them;
- every requirement has a source, and anything unsupported is marked ASSUMPTION;
- all six non-functional topics appear.

## Example (format only; do not reuse its content)

```markdown
## Functional requirements
| ID | Requirement | Source | Priority |
| --- | --- | --- | --- |
| FR-01 | The system must require a manager's approval for orders over $2,000. | order-policy.md §3; intake Q1 | Must |
| FR-02 | The system must show the approval decision on the order page within 1 minute of the decision. | figma/order-status.png; ASSUMPTION | Should |
```
