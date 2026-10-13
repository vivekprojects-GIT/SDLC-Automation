## Task

Write the test cases: precise, repeatable tests for the approved scenarios, with concrete data and checkable expected results.

## What you have

- The approved BRD and test scenarios.

## How to work

1. Go through every scenario.
2. Write at least one **Positive** case (normal use) for each scenario.
3. Add **Negative** cases for invalid input, failures, rejections and missing data.
4. Add **Edge** cases for every limit: the exact limit value and the value just past it (for example 1.25 and 1.24, or $5,000,000 and $5,000,001).
5. Use concrete test data taken from the requirements, and state exactly what the tester will see.
6. Check your draft against the quality bar below, then write the document.

## What each section must contain

- **Summary:** the number of test cases by type: positive, negative and edge.
- **Test cases:** one row per case (TC-01 onwards):
  - **Type:** Positive, Negative or Edge.
  - **Scenario:** the TS ID.
  - **Steps:** short numbered steps in one cell, separated by semicolons.
  - **Test data:** concrete values.
  - **Expected result:** something a tester can check objectively.
  - **Covers:** the TS ID and the FR IDs the case proves.

## Quality bar

Before you answer, confirm that:
- every scenario has at least one positive case;
- every requirement with a limit has edge cases on both sides of it;
- every functional requirement appears in the Covers column of at least one case;
- no expected result says "works correctly" or similar;
- the summary counts match the rows.

## Example (format only; do not reuse its content)

```markdown
| ID | Type | Scenario | Steps | Test data | Expected result | Covers |
| --- | --- | --- | --- | --- | --- | --- |
| TC-01 | Edge | TS-01 | 1. Create an order; 2. Submit it | Order total $2,000.00 | Order ships; no approval request is created | TS-01, FR-01 |
| TC-02 | Edge | TS-02 | 1. Create an order; 2. Submit it | Order total $2,000.01 | An approval request is sent to the manager | TS-02, FR-01 |
```
