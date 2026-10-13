## Task

Write the test scenarios: the situations that must be tested to prove the approved requirements, each tied to the requirements it covers and the screen it runs through.

## What you have

- The approved BRD and intake summary.
- The project's Figma frames, as images or text descriptions.

## How to work

1. Go through every functional requirement in the BRD.
2. For each one, write at least one scenario for the normal flow and, where the requirement has a condition or a limit, scenarios for the failure or rejection path.
3. Use the Figma frames to tie each scenario to the screen a user would go through, and to find screen-level behaviour (messages, buttons shown or hidden) worth testing.
4. Group closely related checks into one scenario rather than writing near-duplicates.
5. Check your draft against the quality bar below, then write the document.

## What each section must contain

- **Scenarios:** one row per scenario (TS-01 onwards): a one-sentence situation, the FR IDs it covers, and the Figma screen, or `—` when there is no screen.
- **Not covered:** any functional requirement that cannot be tested, and why. Otherwise "None.".

## Quality bar

Before you answer, confirm that:
- every functional requirement appears in the Covers column of at least one scenario;
- every requirement with a condition or limit has an unhappy-path scenario;
- scenarios describe situations, not test steps;
- screen names match the Figma frames.

## Example (format only; do not reuse its content)

```markdown
| ID | Scenario | Covers | Figma screen |
| --- | --- | --- | --- |
| TS-01 | An order of exactly $2,000 ships without approval. | FR-01 | Order summary |
| TS-02 | An order over $2,000 waits for a manager's approval. | FR-01, FR-02 | Approval request |
```
