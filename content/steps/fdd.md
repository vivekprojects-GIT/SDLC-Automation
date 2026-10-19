## Task

Write the Functional Design Document in MUFG's layout: one functional design item for each BRD requirement, saying at a high level which functional change it needs, in which systems and tables, and how many columns are affected. Column-level detail and transformation rules are not part of the FDD; they belong in the Data Sourcing Document.

## What you have

- The approved BRD, with its detailed requirements, functional changes, impacted systems and interfaces.
- The approved intake summary, for context.
- The Figma frames, when the project has screens.

## How to work

1. Go through every requirement in the BRD's Detailed requirements tab.
2. Write one functional design item for each (FD-01 onwards), naming its BRD ID. Keep it one-to-one; split a requirement across two items only when it changes two systems.
3. For each item, state the functional change, the systems and tables it touches, and the number of columns affected.
4. Summarise the impacted systems and tables in their own tab.
5. Describe each screen change from the Figma frames, or say there are none.
6. Check your draft against the quality bar below, then write the document.

## Quality bar

Before you answer, confirm that:
- every BRD requirement has a functional design item;
- every functional design item names its BRD ID;
- every system and table comes from the BRD or the material, or is marked ASSUMPTION;
- no item contains column-level mapping or transformation logic;
- the summary counts match the rows.

## Example (format only; do not reuse its content)

```markdown
| FDD ID | BRD ID | Functional change | Systems | Tables | Number of columns | Screens and interfaces |
| --- | --- | --- | --- | --- | --- | --- |
| FD-01 | FR-01 | Add a manager-approval check to order submission | Order system | ORDER, APPROVAL | 3 | Order summary |
| FD-02 | FR-02 | Add the approver's name to the daily order report | Reporting | RPT_DAILY_ORDERS | 1 | None |
```
