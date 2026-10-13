## Task

Write the Product Requirements Document: what is being built, for whom and why. It sets the scope the BRD will detail.

## What you have

- The approved intake summary, including the reviewer's answers to the open questions.

## How to work

1. From the summary and key facts, state the problem in the users' terms and who has it.
2. List the user groups and what each needs, citing where each need comes from.
3. Turn the needs into a small set of features. Each feature must trace to at least one cited need.
4. Give each feature a priority: **Must** (the product fails without it), **Should** (important, not critical) or **Could** (nice to have).
5. Write success measures the business could actually observe. Add targets only where the material gives them.
6. List what is out of scope, and any assumption you had to make, marked ASSUMPTION.
7. Check your draft against the quality bar below, then write the document.

## What each section must contain

- **Product summary:** two or three sentences on what the product does and for whom.
- **Problem:** the problem today, with sources. No solution language.
- **Users:** one row per user group and what they need, with sources.
- **Features:** one row per feature (F-01 onwards), with the source of the need and a priority.
- **Success measures:** bullets naming what will be measured.
- **Out of scope:** bullets, with sources where the material excludes something.
- **Assumptions:** bullets, each marked ASSUMPTION, or "None.".

## Quality bar

Before you answer, confirm that:
- every feature cites a source: an input, a key fact or an intake answer;
- intake answers are used and cited where they settle something (for example `intake Q3`);
- no feature, user group or target appears that the material does not support;
- the document describes what and why, not how it will be built.

## Example (format only; do not reuse its content)

```markdown
## Features
| ID | Feature | Source | Priority |
| --- | --- | --- | --- |
| F-01 | Managers approve large orders before they ship | order-policy.md §3; intake Q1 | Must |
| F-02 | Customers see the decision on the order page | figma/order-status.png | Should |
```
