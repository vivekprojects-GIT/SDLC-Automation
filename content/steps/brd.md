## Task

Write the Business Requirement Document in MUFG's BRD layout. Each section becomes a tab of the Excel workbook: stakeholders, the requirement sessions, current and future state, data flows, scope, the detailed requirements with their BRD ID and type, functional changes, impacted systems, interfaces, reports, and what is in and out of scope. The functional design, data sourcing, technical design and QA strategies are all built from it.

## What you have

- The approved intake summary, with its key facts, sources, open questions and the reviewer's answers.

## How to work

1. **Stakeholders:** list everyone the material names, with their role: the BRD owner, the business lead, the IT leads and each system business owner.
2. **Requirement sessions:** list every call, workshop (JAR/JAD) or important email the requirements came from, with its date and attendees where known, and the input file that records it. MUFG requires the BRD to show that requirement sessions happened.
3. **Business objectives** (BO-01 onwards), each with how it will be measured.
4. **High-level scope, current state and future state:** what this release changes, how things work today, and how they will work after.
5. **Data flows:** each flow between systems, today (Current) and after the release (Future).
6. **Detailed requirements** (FR-01 onwards): go through **every key fact** in the intake. Each fact that describes a behaviour, rule, data need, report or limit becomes at least one requirement. Give each a type (Functional, Data, Report, Interface or Validation) and a priority (Must, Should or Could).
7. **Non-functional requirements** (NFR-01 onwards): cover security and access, personal data and privacy, data retention, accessibility, audit trail and performance. If the material does not settle one, add it with ASSUMPTION as the source so the reviewer decides.
8. **Functional changes, impacted systems, system interfaces and report requirements:** only what this release changes. A section that does not apply says so in one line, with the reason.
9. **In scope and out of scope:** list each item; mark out-of-scope items "Not in scope" with the reason.
10. Check your draft against the quality bar below, then write the document.

## How to write each requirement

- One testable behaviour per row, written as "The system must …".
- State the condition, the behaviour and the exact values: "The system must route the application to a senior credit officer when the loan amount is above $5M."
- Copy every limit, threshold, amount, period and unit exactly from its source. A requirement that refers to "the policy limit" instead of the actual value is not testable.
- Cite the source: the input file and locator, or the intake answer (for example "intake Q2"). If none applies, the source is ASSUMPTION.

## Quality bar

Before you answer, confirm that:
- every key fact from the intake that describes a behaviour, rule, data need or limit is covered by a requirement;
- every requirement has a type, a priority and a source, and anything unsupported is marked ASSUMPTION;
- every requirement states its exact values, not a reference to them;
- every requirement session in the material is listed;
- all six non-functional topics appear;
- every section is filled, or says in one line why it does not apply.

## Example (format only; do not reuse its content)

```markdown
## Detailed requirements
| BRD ID | Requirement | Type | Source | Priority |
| --- | --- | --- | --- | --- |
| FR-01 | The system must require a manager's approval for orders over $2,000. | Functional | order-policy.md §3; intake Q1 | Must |
| FR-02 | The system must add the approver's name to the daily order report. | Report | kickoff-call.txt 14:20 | Should |
```
