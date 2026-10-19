## Task

Write the UAT QA Strategy: how the business will confirm the solution supports how they work, who accepts it, and on which evidence.

## What you have

- The approved BRD and Functional Design Document.
- The approved SIT QA Strategy; SIT exit is part of UAT entry.

## How to work

1. Set the scope, then fill the **Requirements in scope** table: one row for every requirement in the BRD, marked Yes or No, with the reason when No.
2. List the business processes to accept, the requirements each relies on, and the business owner of each.
3. Name the participants: who tests, who supports them, and who signs off.
4. Describe the approach: end-to-end business flows, report checks, and the data business users will use.
5. Describe the UAT environment and data.
6. Define entry criteria (including SIT exit) and exit and sign-off criteria, each one checkable.
7. Describe defect management for defects raised by business users, the schedule, and the risks with their mitigations.
8. Check your draft against the quality bar below, then write the document.

## Quality bar

Before you answer, confirm that:
- every requirement in the BRD has a row in the Requirements in scope table, with Yes or No;
- every business process names the FR IDs it relies on;
- the sign-off owner is named for every process (by role, if no name is given);
- entry criteria include the SIT exit criteria being met;
- every entry, exit and sign-off criterion can be checked objectively;
- nothing is planned that the BRD and FDD do not support; anything assumed is marked ASSUMPTION.

## Example (format only; do not reuse its content)

```markdown
## Business processes to accept
| Process | Requirements | Business owner |
| --- | --- | --- |
| Submit and approve an order | FR-01, FR-02 | Head of Procurement |
| Track an order's approval | FR-03 | Procurement operations lead |
```
