---
document: Functional Design Document
project: Commercial Loan Policy Check
version: "1.0"
status: approved
owner: IT lead
template: standard/fdd.md
generated_by: IT lead agent via GitHub Copilot (copilot/claude-fable-5.1)
approved_by: vivek (IT lead)
approved_at: 2026-10-19T16:15:22.532Z
---

# Functional Design Document: Commercial Loan Policy Check

## Summary
This document contains 24 functional design items, FD-01 through FD-24, covering every BRD requirement from FR-01 through FR-24 one-to-one. The BRD identifies the new policy-check system and legacy Excel checklist but does not provide physical table names or a table-and-column model. Table names and column counts are therefore marked as assumptions or TBD. [BRD Detailed requirements FR-01–FR-24; BRD Functional changes; BRD Impacted systems]

## Functional design
| FDD ID | BRD ID | Functional change | Systems | Tables | Number of columns | Screens and interfaces |
| --- | --- | --- | --- | --- | --- | --- |
| FD-01 | FR-01 | Start a policy check when an RM submits an application for policy checking. [BRD FR-01] | New policy-check system; application-submission system name not provided [BRD System interfaces] | ASSUMPTION: Table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: table and column model not provided. | Application summary; submission-to-policy-check interface |
| FD-02 | FR-02 | Evaluate the DSCR rule against the stated threshold and record its outcome. [BRD FR-02] | New policy-check system [BRD Impacted systems] | ASSUMPTION: Table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: table and column model not provided. | Policy check results |
| FD-03 | FR-03 | When collateral is real estate, evaluate the LTV rule against the stated threshold and record its outcome. [BRD FR-03] | New policy-check system [BRD Impacted systems] | ASSUMPTION: Table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: table and column model not provided. | Policy check results |
| FD-04 | FR-04 | Evaluate total borrower exposure, including existing loans, against the stated limit and record the outcome. [BRD FR-04] | New policy-check system [BRD Impacted systems] | ASSUMPTION: Table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: table and column model not provided. | Policy check results |
| FD-05 | FR-05 | Treat a risk rating from 1 to 6 as eligible. [BRD FR-05] | New policy-check system [BRD Impacted systems] | ASSUMPTION: Table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: table and column model not provided. | Policy check results |
| FD-06 | FR-06 | Decline a loan with a risk rating of 7 or worse, without an exception path. [BRD FR-06; intake Q2] | New policy-check system [BRD Impacted systems] | ASSUMPTION: Table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: table and column model not provided. | Policy check results |
| FD-07 | FR-07 | Require an exception decision before a loan can proceed when a rule fails and the loan is not declined. [BRD FR-07; intake Q2] | New policy-check system [BRD Impacted systems] | ASSUMPTION: Table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: table and column model not provided. | Policy check results; exception request |
| FD-08 | FR-08 | Assign an exception decision to a senior credit officer when the loan amount is above $5M. [BRD FR-08; intake Q1] | New policy-check system [BRD Impacted systems] | ASSUMPTION: Table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: table and column model not provided. | Exception request |
| FD-09 | FR-09 | Assign an exception decision to a credit officer when the loan amount is $5M or less. [BRD FR-09; intake Q1] | New policy-check system [BRD Impacted systems] | ASSUMPTION: Table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: table and column model not provided. | Exception request |
| FD-10 | FR-10 | Show the required application and policy-input information on the application summary. [BRD FR-10; figma/application-summary.md] | New policy-check system [BRD Impacted systems] | ASSUMPTION: Table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: table and column model not provided. | Application summary |
| FD-11 | FR-11 | Provide the “Submit for policy check” action on the application summary. [BRD FR-11; figma/application-summary.md] | New policy-check system [BRD Impacted systems] | ASSUMPTION: Table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: table and column model not provided. | Application summary; submission-to-policy-check interface |
| FD-12 | FR-12 | Show a Pass or Fail outcome for each DSCR, LTV, exposure and risk rating rule. [BRD FR-12; figma/policy-check-results.md] | New policy-check system [BRD Impacted systems] | ASSUMPTION: Table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: table and column model not provided. | Policy check results |
| FD-13 | FR-13 | For each failed rule, show its reason, actual value and limit. [BRD FR-13; figma/policy-check-results.md] | New policy-check system [BRD Impacted systems] | ASSUMPTION: Table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: table and column model not provided. | Policy check results |
| FD-14 | FR-14 | Show “Request exception” only when a rule fails and the loan is not declined. [BRD FR-14; intake Q2; figma/policy-check-results.md] | New policy-check system [BRD Impacted systems] | ASSUMPTION: Table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: table and column model not provided. | Policy check results |
| FD-15 | FR-15 | Show failed rules and their reasons on the exception request. [BRD FR-15; figma/exception-request.md] | New policy-check system [BRD Impacted systems] | ASSUMPTION: Table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: table and column model not provided. | Exception request |
| FD-16 | FR-16 | Provide an RM justification text box on the exception request. [BRD FR-16; figma/exception-request.md] | New policy-check system [BRD Impacted systems] | ASSUMPTION: Table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: table and column model not provided. | Exception request |
| FD-17 | FR-17 | Identify the deciding role as credit officer or senior credit officer on the exception request. [BRD FR-17; intake Q1; figma/exception-request.md] | New policy-check system [BRD Impacted systems] | ASSUMPTION: Table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: table and column model not provided. | Exception request |
| FD-18 | FR-18 | Provide “Approve exception” and “Decline” actions on the exception request. [BRD FR-18; figma/exception-request.md] | New policy-check system [BRD Impacted systems] | ASSUMPTION: Table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: table and column model not provided. | Exception request |
| FD-19 | FR-19 | Keep a full record of every policy check and every decision. [BRD FR-19] | New policy-check system [BRD Impacted systems] | ASSUMPTION: Record table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: record fields and table model are not provided. | None |
| FD-20 | FR-20 | Restrict policy-check results to RMs and credit staff. [BRD FR-20] | New policy-check system [BRD Impacted systems] | ASSUMPTION: Table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: table and column model not provided. | Policy check results |
| FD-21 | FR-21 | Migrate every legacy checklist row submitted in the three years before go-live. [BRD FR-21; intake Q4] | Legacy Excel checklist; new policy-check system [BRD System interfaces; intake Q4] | Legacy checklist file; destination table name(s) not provided (ASSUMPTION). | TBD; ASSUMPTION: destination table and column model not provided. | Legacy checklist migration interface |
| FD-22 | FR-22 | Migrate the specified legacy checklist fields into the new system. [BRD FR-22; legacy-policy-checklist.csv row 1; intake Q4] | Legacy Excel checklist; new policy-check system [BRD System interfaces] | Legacy checklist file; destination table name(s) not provided (ASSUMPTION). | TBD; ASSUMPTION: destination table and column model not provided. | Legacy checklist migration interface |
| FD-23 | FR-23 | Make migrated checklist history available to show a borrower’s history. [BRD FR-23; intake Q4] | New policy-check system [BRD Impacted systems] | ASSUMPTION: Table name(s) not provided; identify in DSD. | TBD; ASSUMPTION: table and column model not provided. | Borrower history; exact screen or interface not specified |
| FD-24 | FR-24 | Migrate a legacy checklist row even when it has no loan ID. [BRD FR-24; legacy-policy-checklist.csv row 6] | Legacy Excel checklist; new policy-check system [BRD System interfaces] | Legacy checklist file; destination table name(s) not provided (ASSUMPTION). | TBD; ASSUMPTION: destination table and column model not provided. | Legacy checklist migration interface |

## Impacted systems and tables
| System | Table | Change | Number of columns | FDD IDs |
| --- | --- | --- | --- | --- |
| New policy-check system; system name not provided [BRD Impacted systems] | ASSUMPTION: Physical table names are not provided; identify in DSD. | Policy checks, rule outcomes, exception handling, records, access restriction and borrower history. [BRD Functional changes] | TBD; ASSUMPTION: table and column model not provided. | FD-01; FD-02; FD-03; FD-04; FD-05; FD-06; FD-07; FD-08; FD-09; FD-10; FD-11; FD-12; FD-13; FD-14; FD-15; FD-16; FD-17; FD-18; FD-19; FD-20; FD-23 |
| Legacy Excel checklist [BRD System interfaces] | Legacy checklist file; worksheet or table name not provided. | Source for the specified checklist-history migration. [BRD FR-21; BRD FR-22; BRD FR-24] | TBD; ASSUMPTION: source and destination table model not provided. | FD-21; FD-22; FD-24 |

## Screens and user interactions
- **Application summary** — The sample frame shows borrower name, loan ID, amount, collateral type, DSCR, LTV, existing exposure to the borrower and risk rating, plus the “Submit for policy check” action. The action starts the policy check. Required field validation and messages are not specified. [BRD FR-01; BRD FR-10; BRD FR-11; figma/application-summary.md]
- **Policy check results** — The sample frame shows one row for each DSCR, LTV, exposure and risk rating rule, with Pass or Fail. A failed rule shows its reason, actual value and limit. “Request exception” appears only when a rule fails and the loan is not declined. Exact message text is not specified. LTV display for non-real-estate collateral remains unresolved. [BRD FR-03; BRD FR-12; BRD FR-13; BRD FR-14; intake Q3; figma/policy-check-results.md]
- **Exception request** — The sample frame shows failed rules and their reasons, an RM justification text box, the deciding role, and “Approve exception” and “Decline” actions. Input validation and confirmation or error messages are not specified. [BRD FR-15; BRD FR-16; BRD FR-17; BRD FR-18; figma/exception-request.md]
- The supplied Figma descriptions are samples; PNG exports of real frames are not provided in the material. [figma/application-summary.md; figma/policy-check-results.md; figma/exception-request.md; intake Q11]

## Assumptions and open points
- **ASSUMPTION:** The new policy-check system’s name and physical table names are not provided. Confirm these before detailed design and implementation. [BRD Impacted systems]
- **ASSUMPTION:** Physical column counts cannot be determined until the table model is supplied. Confirm counts in the DSD; no column-level mapping is defined in this FDD. [BRD Detailed requirements FR-01–FR-24]
- **ASSUMPTION:** The legacy checklist’s worksheet or table name and migration interface details are not provided. [BRD System interfaces]
- The LTV display and check behavior for collateral types other than real estate remains unresolved. [intake Q3]
- Further access-control rules, privacy controls, retention periods, accessibility requirements and the required contents of the full check and decision record remain unresolved. [intake Q6; intake Q7; intake Q8; intake Q9; intake Q10]
- The supplied Figma descriptions are samples; whether PNG exports of real frames will be provided remains unresolved. [intake Q11]
