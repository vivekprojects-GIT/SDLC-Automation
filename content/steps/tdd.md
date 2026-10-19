## Task

Write the Technical Design Document: the single detailed design (no separate high-level and low-level design) for building every functional design item, including the ETL design for the data attributes in the DRD and DSD.

## What you have

- The approved BRD, Functional Design Document and Data Sourcing Document (with its DRD tab).

## How to work

1. Go through every functional design item in the FDD.
2. Write at least one technical design item for each (TD-01 onwards): the component, the design, the data it uses, and the FDD IDs (and DRD IDs) it builds.
3. Design the ETL: one job per load, with its source, target, the DSD mapping IDs it applies, its schedule and dependencies.
4. List the data model changes: each table, the change and the columns.
5. Describe error handling and recovery, the non-functional design the BRD asks for, and deployment considerations.
6. Check your draft against the quality bar below, then write the document.

## Quality bar

Before you answer, confirm that:
- every functional design item is covered by a technical design item;
- every technical design item names the FDD IDs it builds;
- every ETL transformation points to a DSD mapping rather than restating it;
- every non-functional requirement in the BRD is addressed;
- the summary counts match the rows.

## Example (format only; do not reuse its content)

```markdown
| TDD ID | Component | Design | Data | Covers |
| --- | --- | --- | --- | --- |
| TD-01 | Order approval service | Add an approval check before release; call the HR API for the manager | ORDER, APPROVAL | FD-01 |
| TD-02 | Daily order report load | Nightly job joins APPROVAL to EMPLOYEE and loads the approver's name | RPT_DAILY_ORDERS | FD-02, DA-01 |
```
