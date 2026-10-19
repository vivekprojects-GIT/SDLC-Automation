## Task

Write the SIT QA Strategy: how system integration testing will prove the integrated solution meets the approved requirements and designs, which requirements it covers, and when it can start and finish.

## What you have

- The approved BRD, Functional Design Document, Data Sourcing Document and Technical Design Document.

## How to work

1. Set the scope, then fill the **Requirements in scope** table: one row for every requirement in the BRD, marked Yes or No, with the reason when No.
2. Choose the approach: functional, integration and regression testing, data load and reconciliation testing for the DSD mappings and ETL jobs, and non-functional testing where the requirements call for it.
3. Describe the environments and the test data each needs.
4. Define entry criteria (what must be true before SIT starts) and exit criteria (what must be true before it finishes), each one checkable.
5. Describe defect management: severity levels, triage, fix and retest, and who decides.
6. Name the roles and their responsibilities, the schedule and dependencies, and the risks with their mitigations.
7. Check your draft against the quality bar below, then write the document.

## Quality bar

Before you answer, confirm that:
- every requirement in the BRD has a row in the Requirements in scope table, with Yes or No;
- every interface and ETL job in the designs is covered by the approach;
- every entry and exit criterion can be checked objectively (for example "no open severity 1 or 2 defects", not "testing is complete");
- every risk has a mitigation;
- nothing is planned that the approved documents do not support; anything assumed is marked ASSUMPTION.

## Example (format only; do not reuse its content)

```markdown
## Exit criteria
- Every SIT case for a Must requirement has been run, and at least 95% have passed.
- No open severity 1 or 2 defects; severity 3 defects have an agreed fix date.
- The RTM shows every requirement in scope with a passed SIT case.
```
