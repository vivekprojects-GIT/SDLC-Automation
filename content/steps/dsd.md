## Task

Write the Data Sourcing Document with its Data Requirement Document tab. The DRD tab lists every data attribute the project touches. The Data sourcing tab gives each one's source-to-destination mapping and any transformation logic. Both are completed in Planning, before any ETL development.

## What you have

- The approved BRD and Functional Design Document: the requirements, systems and tables that change.
- The input files, including legacy files whose columns show the real source fields.

## How to work

1. Go through every FDD item and every Data, Report and Interface requirement in the BRD.
2. In the DRD tab, list each impacted data attribute (DA-01 onwards): its business definition, data type, target table, and the BRD and FDD IDs it serves.
3. In the Data sourcing tab, write one mapping (DS-01 onwards) for each attribute: the source system, source table and column, destination table and column, and the transformation logic. Write "Direct copy" when none is needed. Take source fields from the input files where they show them.
4. When an attribute cannot be sourced from any system, record the manual workaround: the form (for example Wdesk), the owner in the line of business, the reviewer and the frequency.
5. Check your draft against the quality bar below, then write the document.

## Quality bar

Before you answer, confirm that:
- every data attribute names the BRD or FDD ID it serves;
- every data attribute has a source-to-destination mapping;
- every transformation is stated as a rule, with exact values, never "as per logic";
- every source system, table and column comes from the material, or is marked ASSUMPTION;
- the summary counts match the rows.

## Example (format only; do not reuse its content)

```markdown
## Data requirements (DRD)
| DRD ID | Data attribute | Business definition | Data type | Target table | BRD ID | FDD ID |
| --- | --- | --- | --- | --- | --- | --- |
| DA-01 | approver_name | Name of the manager who approved the order | VARCHAR(100) | RPT_DAILY_ORDERS | FR-02 | FD-02 |

## Data sourcing
| Mapping ID | Data attribute | Source system | Source table and column | Destination table and column | Transformation logic | IT lead |
| --- | --- | --- | --- | --- | --- | --- |
| DS-01 | DA-01 | HR system | EMPLOYEE.FULL_NAME | RPT_DAILY_ORDERS.APPROVER_NAME | Join on APPROVAL.APPROVER_ID = EMPLOYEE.ID | Reporting IT lead |
```
