---
document: Technical Design Document
project: Commercial Loan Policy Check
version: "1.0"
status: approved
owner: IT lead
template: standard/tdd.md
generated_by: IT lead agent via GitHub Copilot (copilot/claude-fable-5.1)
approved_by: vivek (IT lead)
approved_at: 2026-10-19T16:18:25.234Z
---

# Technical Design Document: Commercial Loan Policy Check

## Summary
24 technical design items covering 24 functional design items.

## Solution overview
The new policy-check system receives an application submission from the application-submission system and processes the policy rules. It stores application inputs and calculated outcomes in logical policy-check record and result tables, presents the summary and results, and stores exception requests and decisions in a logical exception record table. The source system and physical table names are not provided. [FDD FD-01–FD-20; DSD DS-01–DS-31]

A separate migration load reads the legacy checklist file and writes eligible rows to policy-check history. It migrates rows submitted in the three years before go-live and maps the specified legacy fields. [BRD FR-21–FR-22; intake Q4; DSD DS-09–DS-11, DS-32–DS-38]

The policy-check system must restrict results to RMs and credit staff and retain records of every policy check and decision. The provided material does not define a retention period, physical schema, interface protocol, or operating schedule. [BRD FR-19–FR-20]

## Technical design items
| TDD ID | Component | Design | Data | Covers |
| --- | --- | --- | --- | --- |
| TD-01 | Submission interface | On RM submission for policy checking, invoke the policy-check system with the application data. Source system, interface contract, and physical tables are ASSUMPTION: not supplied. [BRD FR-01; FDD FD-01] | DA-01–DA-08; policy-check record table (ASSUMPTION) | FD-01; DA-01–DA-08 |
| TD-02 | DSCR rule processor | Evaluate and record the DSCR outcome using DSD mappings DS-13, DS-17, DS-21, and DS-25. [BRD FR-02; FDD FD-02] | DA-05, DA-13, DA-17, DA-21, DA-25 | FD-02; DA-05, DA-13, DA-17, DA-21, DA-25 |
| TD-03 | LTV rule processor | For real-estate collateral, evaluate and record the LTV outcome using DSD mappings DS-14, DS-18, DS-22, and DS-26. Handling for other collateral types remains unresolved; do not infer an outcome. [BRD FR-03; FDD FD-03; intake Q3] | DA-04, DA-06, DA-14, DA-18, DA-22, DA-26 | FD-03; DA-04, DA-06, DA-14, DA-18, DA-22, DA-26 |
| TD-04 | Exposure rule processor | Calculate and evaluate total borrower exposure using DSD mappings DS-12, DS-15, DS-19, DS-23, and DS-27. [BRD FR-04; FDD FD-04] | DA-03, DA-07, DA-12, DA-15, DA-19, DA-23, DA-27 | FD-04; DA-03, DA-07, DA-12, DA-15, DA-19, DA-23, DA-27 |
| TD-05 | Eligible risk-rating processor | Record the risk-rating outcome for ratings 1 to 6 using DSD mappings DS-16 and DS-28. [BRD FR-05; FDD FD-05] | DA-08, DA-16, DA-28 | FD-05; DA-08, DA-16, DA-28 |
| TD-06 | Risk-rating decline processor | Decline ratings of 7 or worse and do not expose an exception path, using DSD mappings DS-16, DS-20, and DS-28. [BRD FR-06; intake Q2; FDD FD-06] | DA-08, DA-16, DA-20, DA-24, DA-28 | FD-06; DA-08, DA-16, DA-20, DA-24, DA-28 |
| TD-07 | Exception eligibility gate | Require an exception decision before a non-declined loan with a failed rule can proceed. Suppress the exception path for declined loans. [BRD FR-07; intake Q2; FDD FD-07] | Rule outcomes DA-13–DA-16; decision DA-31 | FD-07; DA-13–DA-16, DA-31 |
| TD-08 | Senior officer routing | Assign exception decisions to a senior credit officer when the loan amount is above $5M, using DSD mapping DS-30. [BRD FR-08; intake Q1; FDD FD-08] | DA-03, DA-30 | FD-08; DA-03, DA-30 |
| TD-09 | Credit officer routing | Assign exception decisions to a credit officer when the loan amount is $5M or less, using DSD mapping DS-30. [BRD FR-09; intake Q1; FDD FD-09] | DA-03, DA-30 | FD-09; DA-03, DA-30 |
| TD-10 | Application summary | Display borrower name, loan ID, amount, collateral type, DSCR, LTV, existing exposure, and risk rating from the policy-check record. [BRD FR-10; FDD FD-10] | DA-01–DA-08 | FD-10; DA-01–DA-08 |
| TD-11 | Summary submission action | Provide the “Submit for policy check” action and connect it to the submission interface in TD-01. [BRD FR-11; FDD FD-11] | Application data DA-01–DA-08 | FD-11; DA-01–DA-08 |
| TD-12 | Policy results display | Display a Pass or Fail row for each DSCR, LTV, exposure, and risk-rating rule using the stored outcomes. [BRD FR-12; FDD FD-12] | DA-13–DA-16 | FD-12; DA-13–DA-16 |
| TD-13 | Failed-rule details | For each failed rule, display its reason, actual value, and limit from the stored result data. [BRD FR-13; FDD FD-13] | DA-17–DA-28 | FD-13; DA-17–DA-28 |
| TD-14 | Exception action visibility | Show “Request exception” only when a rule fails and the loan is not declined. [BRD FR-14; intake Q2; FDD FD-14] | DA-13–DA-16; decline status from risk-rating processing | FD-14; DA-13–DA-16 |
| TD-15 | Exception request details | Display the failed rules and their reasons on the exception request, using the stored policy results. [BRD FR-15; FDD FD-15] | DA-17–DA-20 | FD-15; DA-17–DA-20 |
| TD-16 | RM justification input | Provide an RM justification text box and persist its entered text using DSD mapping DS-29. [BRD FR-16; FDD FD-16] | DA-29 | FD-16; DA-29 |
| TD-17 | Deciding-role display | Display the assigned role, credit officer or senior credit officer, using DSD mapping DS-30. [BRD FR-17; intake Q1; FDD FD-17] | DA-03, DA-30 | FD-17; DA-03, DA-30 |
| TD-18 | Exception decision actions | Provide “Approve exception” and “Decline” actions and persist the selected action using DSD mapping DS-31. [BRD FR-18; FDD FD-18] | DA-31 | FD-18; DA-31 |
| TD-19 | Check and decision history | Persist each policy check, its outcomes, and each exception decision in the logical policy-check record, result, and exception record tables. Physical table names and full record fields are ASSUMPTION: not supplied. [BRD FR-19; FDD FD-19] | DA-01–DA-31, as applicable to each check or decision | FD-19; DA-01–DA-31 |
| TD-20 | Results authorization | Restrict access to policy-check results to RMs and credit staff. Role source, authorization mechanism, and physical access-control design are ASSUMPTION: not supplied. [BRD FR-20; FDD FD-20] | Policy-check results and associated application data | FD-20 |
| TD-21 | Legacy row selection and migration | Select every legacy checklist row submitted in the three years before go-live and load it to policy-check history. Physical target table name is ASSUMPTION: not supplied. [BRD FR-21; intake Q4; FDD FD-21] | DA-09–DA-11; migration population | FD-21; DA-09–DA-11 |
| TD-22 | Legacy field migration | Map the specified legacy checklist fields into policy-check history using DSD mappings DS-09–DS-11 and DS-32–DS-38. Preserve a missing loan ID as specified by the DSD. [BRD FR-22; legacy-policy-checklist.csv row 1; FDD FD-22] | DA-01–DA-11 | FD-22; DA-01–DA-11 |
| TD-23 | Borrower history access in the new policy-check system | Make migrated checklist history available to show a borrower’s history; the screen or interface and borrower lookup method require confirmation. [BRD FR-23; FDD FD-23; ASSUMPTION] | Migrated checklist history; `loan_id` (DA-02); other history attributes are not specified. [DRD DA-02; ASSUMPTION] | FD-23 |
| TD-24 | Legacy checklist migration load | Load legacy checklist rows, including rows without a loan ID, into the assumed policy-check history table using mapping DS-33. Target table name and missing-value representation require confirmation. [FDD FD-24; DSD DS-33; BRD FR-24; ASSUMPTION] | `legacy-policy-checklist.csv.loan_id` to assumed policy-check history table.`loan_id`; preserve missing loan ID. [DSD DS-33] | FD-24; DA-02 |

## ETL design
| Job | Source | Target | Transformation | Schedule | Depends on |
| --- | --- | --- | --- | --- | --- |
| Submission-triggered policy-check load | Application-submission system; physical source name and table are ASSUMPTION: not supplied. | New policy-check system; logical policy-check record and result tables (physical names ASSUMPTION). | Apply DSD mappings DS-01–DS-08 and DS-12–DS-28. | On RM submission for policy checking. [BRD FR-01] | Submission interface and application data availability; exact interface contract is ASSUMPTION. |
| Exception request and decision load | Exception request and decision actions in the new policy-check system; physical source tables are ASSUMPTION. | Logical exception record table (physical name ASSUMPTION). | Apply DSD mappings DS-29–DS-31. | On exception request or decision action. [BRD FR-07–FR-18] | Policy-check results; assigned deciding role; exception eligibility gate. |
| Legacy checklist migration load | Legacy Excel checklist file, `legacy-policy-checklist.csv`. | Logical policy-check history table (physical name ASSUMPTION). | Apply DSD mappings DS-09–DS-11 and DS-32–DS-38. | One-time migration before go-live; exact run date and execution schedule are ASSUMPTION. | Legacy file availability; agreed physical target schema; three-year-before-go-live selection period. [BRD FR-21; intake Q4] |

## Data model changes
| Table | Change | Columns |
| --- | --- | --- |
| Policy-check record table (logical name; physical name ASSUMPTION) | Add application inputs and calculated total borrower exposure. The material does not specify physical types, lengths, keys, or indexes. [DRD DA-01–DA-08, DA-12] | borrower_name; loan_id; amount; collateral_type; dscr; ltv; existing_exposure; risk_rating; total_borrower_exposure |
| Policy-check result table (logical name; physical name ASSUMPTION) | Add rule outcomes, failure details, actual values, and limits. The material does not specify physical types, lengths, keys, or indexes. [DRD DA-13–DA-28] | dscr_outcome; ltv_outcome; exposure_outcome; risk_rating_outcome; dscr_failure_reason; ltv_failure_reason; exposure_failure_reason; risk_rating_failure_reason; dscr_actual_value; ltv_actual_value; exposure_actual_value; risk_rating_actual_value; dscr_limit; ltv_limit; exposure_limit; risk_rating_limit |
| Exception record table (logical name; physical name ASSUMPTION) | Add exception justification, assigned role, and decision. The material does not specify physical types, lengths, keys, or indexes. [DRD DA-29–DA-31] | rm_justification; deciding_role; exception_decision |
| Policy-check history table (logical name; physical name ASSUMPTION) | Add migrated legacy checklist fields. The material does not specify physical types, lengths, keys, or indexes. [DRD DA-01–DA-11] | borrower_name; loan_id; amount; dscr; ltv; existing_exposure; risk_rating; submitted_date; legacy_result; checker |

## Error handling and recovery
The supplied material does not define job-level failure handling, restart rules, or alert recipients. The following operating design is an ASSUMPTION for review:

- A failed submission-triggered load must not present an incomplete policy result as complete. Retrying must not create duplicate policy-check records.
- A failed exception request or decision load must leave the exception pending until the write succeeds; retrying must not create duplicate decisions.
- A failed migration load must record the failed row and error, allow restart from the failed row, and avoid duplicate migrated rows.
- Alert the operational support owner on job failure. The support owner and alert channel are ASSUMPTION: not provided.
- Preserve processing status and error details for investigation. Storage location and retention are ASSUMPTION: not provided.

## Non-functional design
- **Access:** Restrict policy-check results to RMs and credit staff. The role source and access-control implementation are ASSUMPTION: not provided. [BRD FR-20]
- **Audit:** Keep a full record of every policy check and every decision. The audit fields, retention period, and audit access are ASSUMPTION: not provided. [BRD FR-19]
- **Performance, availability, security controls beyond access, and data retention:** No requirements for these are stated in the supplied BRD material. [BRD version 1.0, supplied rows]

## Deployment considerations
- Deploy the policy-check data structures and processing components before enabling the submission action; physical deployment sequence is ASSUMPTION pending environment and release details.
- Deploy the submission interface, rule processing, results display, exception workflow, and access control before enabling policy-check submissions. [BRD FR-01–FR-20]
- Run the legacy migration before go-live and select every checklist row submitted in the three years before go-live. Validate that the specified fields are migrated; validation criteria and reconciliation counts are ASSUMPTION: not provided. [BRD FR-21–FR-22; intake Q4]
- The number and names of environments, deployment tooling, back-out procedure, and data back-fill approach beyond the stated legacy migration are ASSUMPTION: not provided.

## Assumptions and open points
- ASSUMPTION: Physical system, table, column, key, and interface names are not supplied; logical table names in this document require approval and mapping to physical objects. [FDD FD-01–FD-22; DSD]
- Open point: The LTV outcome for collateral other than real estate is unresolved. No outcome is inferred. [DSD DS-14; intake Q3]
- ASSUMPTION: Data types, lengths, precision, scale, nullability, and indexes are not specified in the DRD. [DRD DA-01–DA-31]
- ASSUMPTION: Job retry policy, idempotency keys, alert owner, alert channel, and operational support process are not supplied.
- ASSUMPTION: Retention period, performance targets, deployment environments, and migration reconciliation criteria are not supplied.
