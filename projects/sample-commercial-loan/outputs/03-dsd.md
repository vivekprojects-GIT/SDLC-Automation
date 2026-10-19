---
document: Data Sourcing Document (with Data Requirement Document)
project: Commercial Loan Policy Check
version: "1.0"
status: approved
owner: IT lead
template: standard/dsd.md
generated_by: IT lead agent via GitHub Copilot (copilot/claude-fable-5.1)
approved_by: vivek (IT lead)
approved_at: 2026-10-19T16:16:46.524Z
---

# Data Sourcing Document: Commercial Loan Policy Check

## Summary
31 impacted data attributes; 14 require transformation logic; 0 require a manual workaround. Physical destination table and column names are not provided and are marked ASSUMPTION. [FDD Impacted systems and tables]

## Data requirements (DRD)
| DRD ID | Data attribute | Business definition | Data type | Target table | BRD ID | FDD ID |
| --- | --- | --- | --- | --- | --- | --- |
| DA-01 | borrower_name | Borrower name shown with an application and retained in checklist history. | ASSUMPTION: VARCHAR; type and length not specified. | ASSUMPTION: policy-check record table; physical name not provided. | FR-10; FR-22 | FD-10; FD-22 |
| DA-02 | loan_id | Loan identifier shown with an application and retained in checklist history; may be absent in a migrated row. | ASSUMPTION: VARCHAR; type and length not specified. | ASSUMPTION: policy-check record table; physical name not provided. | FR-10; FR-22; FR-24 | FD-10; FD-22; FD-24 |
| DA-03 | amount | Loan amount shown with an application and used for exposure and exception routing. | ASSUMPTION: DECIMAL; precision and scale not specified. | ASSUMPTION: policy-check record table; physical name not provided. | FR-08; FR-09; FR-10; FR-22 | FD-08; FD-09; FD-10; FD-22 |
| DA-04 | collateral_type | Collateral type shown with an application and used to determine whether the real-estate LTV rule applies. | ASSUMPTION: VARCHAR; type and length not specified. | ASSUMPTION: policy-check record table; physical name not provided. | FR-03; FR-10 | FD-03; FD-10 |
| DA-05 | dscr | Application debt service coverage ratio (DSCR). | ASSUMPTION: DECIMAL; precision and scale not specified. | ASSUMPTION: policy-check record table; physical name not provided. | FR-02; FR-10; FR-22 | FD-02; FD-10; FD-22 |
| DA-06 | ltv | Application loan to value (LTV). | ASSUMPTION: DECIMAL; precision and scale not specified. | ASSUMPTION: policy-check record table; physical name not provided. | FR-03; FR-10; FR-22 | FD-03; FD-10; FD-22 |
| DA-07 | existing_exposure | Existing exposure to the borrower, shown with an application and included in the exposure check. | ASSUMPTION: DECIMAL; precision and scale not specified. | ASSUMPTION: policy-check record table; physical name not provided. | FR-04; FR-10; FR-22 | FD-04; FD-10; FD-22 |
| DA-08 | risk_rating | Application risk rating used for eligibility and decline decisions. | ASSUMPTION: integer; type not specified. | ASSUMPTION: policy-check record table; physical name not provided. | FR-05; FR-06; FR-10; FR-22 | FD-05; FD-06; FD-10; FD-22 |
| DA-09 | submitted_date | Date the legacy checklist row was submitted. | ASSUMPTION: DATE; type and format not specified. | ASSUMPTION: policy-check history table; physical name not provided. | FR-21; FR-22 | FD-21; FD-22 |
| DA-10 | legacy_result | Result recorded on a legacy checklist row. | ASSUMPTION: VARCHAR; type and length not specified. | ASSUMPTION: policy-check history table; physical name not provided. | FR-21; FR-22 | FD-21; FD-22 |
| DA-11 | checker | Checker recorded on a legacy checklist row. | ASSUMPTION: VARCHAR; type and length not specified. | ASSUMPTION: policy-check history table; physical name not provided. | FR-21; FR-22 | FD-21; FD-22 |
| DA-12 | total_borrower_exposure | Current loan amount plus existing exposure to the borrower. | ASSUMPTION: DECIMAL; precision and scale not specified. | ASSUMPTION: policy-check record table; physical name not provided. | FR-04 | FD-04 |
| DA-13 | dscr_outcome | Pass or Fail outcome of the DSCR rule. | ASSUMPTION: VARCHAR; type and length not specified. | ASSUMPTION: policy-check result table; physical name not provided. | FR-02; FR-12; FR-19 | FD-02; FD-12; FD-19 |
| DA-14 | ltv_outcome | Pass or Fail outcome of the LTV rule when real estate is collateral. | ASSUMPTION: VARCHAR; type and length not specified. | ASSUMPTION: policy-check result table; physical name not provided. | FR-03; FR-12; FR-19 | FD-03; FD-12; FD-19 |
| DA-15 | exposure_outcome | Pass or Fail outcome of the total exposure rule. | ASSUMPTION: VARCHAR; type and length not specified. | ASSUMPTION: policy-check result table; physical name not provided. | FR-04; FR-12; FR-19 | FD-04; FD-12; FD-19 |
| DA-16 | risk_rating_outcome | Pass or Fail outcome of the risk rating rule. | ASSUMPTION: VARCHAR; type and length not specified. | ASSUMPTION: policy-check result table; physical name not provided. | FR-05; FR-06; FR-12; FR-19 | FD-05; FD-06; FD-12; FD-19 |
| DA-17 | dscr_failure_reason | Reason displayed when the DSCR rule fails. | ASSUMPTION: VARCHAR; type and length not specified. | ASSUMPTION: policy-check result table; physical name not provided. | FR-13; FR-15 | FD-13; FD-15 |
| DA-18 | ltv_failure_reason | Reason displayed when the LTV rule fails. | ASSUMPTION: VARCHAR; type and length not specified. | ASSUMPTION: policy-check result table; physical name not provided. | FR-13; FR-15 | FD-13; FD-15 |
| DA-19 | exposure_failure_reason | Reason displayed when the exposure rule fails. | ASSUMPTION: VARCHAR; type and length not specified. | ASSUMPTION: policy-check result table; physical name not provided. | FR-13; FR-15 | FD-13; FD-15 |
| DA-20 | risk_rating_failure_reason | Reason displayed when the risk rating rule fails. | ASSUMPTION: VARCHAR; type and length not specified. | ASSUMPTION: policy-check result table; physical name not provided. | FR-13; FR-15 | FD-13; FD-15 |
| DA-21 | dscr_actual_value | DSCR value shown for a failed DSCR rule. | ASSUMPTION: DECIMAL; precision and scale not specified. | ASSUMPTION: policy-check result table; physical name not provided. | FR-13 | FD-13 |
| DA-22 | ltv_actual_value | LTV value shown for a failed LTV rule. | ASSUMPTION: DECIMAL; precision and scale not specified. | ASSUMPTION: policy-check result table; physical name not provided. | FR-13 | FD-13 |
| DA-23 | exposure_actual_value | Total borrower exposure shown for a failed exposure rule. | ASSUMPTION: DECIMAL; precision and scale not specified. | ASSUMPTION: policy-check result table; physical name not provided. | FR-13 | FD-13 |
| DA-24 | risk_rating_actual_value | Risk rating shown for a failed risk rating rule. | ASSUMPTION: integer; type not specified. | ASSUMPTION: policy-check result table; physical name not provided. | FR-13 | FD-13 |
| DA-25 | dscr_limit | DSCR limit shown for a failed DSCR rule. | ASSUMPTION: DECIMAL; precision and scale not specified. | ASSUMPTION: policy-check result table; physical name not provided. | FR-02; FR-13 | FD-02; FD-13 |
| DA-26 | ltv_limit | LTV limit shown for a failed LTV rule. | ASSUMPTION: DECIMAL; precision and scale not specified. | ASSUMPTION: policy-check result table; physical name not provided. | FR-03; FR-13 | FD-03; FD-13 |
| DA-27 | exposure_limit | Exposure limit shown for a failed exposure rule. | ASSUMPTION: DECIMAL; precision and scale not specified. | ASSUMPTION: policy-check result table; physical name not provided. | FR-04; FR-13 | FD-04; FD-13 |
| DA-28 | risk_rating_limit | Risk rating eligibility and decline boundary shown for a failed risk rating rule. | ASSUMPTION: VARCHAR; type and length not specified. | ASSUMPTION: policy-check result table; physical name not provided. | FR-05; FR-06; FR-13 | FD-05; FD-06; FD-13 |
| DA-29 | rm_justification | RM’s text justification for an exception request. | ASSUMPTION: VARCHAR; type and length not specified. | ASSUMPTION: exception record table; physical name not provided. | FR-16; FR-19 | FD-16; FD-19 |
| DA-30 | deciding_role | Role assigned to decide an exception: credit officer or senior credit officer. | ASSUMPTION: VARCHAR; type and length not specified. | ASSUMPTION: exception record table; physical name not provided. | FR-08; FR-09; FR-17; FR-19 | FD-08; FD-09; FD-17; FD-19 |
| DA-31 | exception_decision | Exception decision action: approve exception or decline. | ASSUMPTION: VARCHAR; type and length not specified. | ASSUMPTION: exception record table; physical name not provided. | FR-07; FR-18; FR-19 | FD-07; FD-18; FD-19 |

## Data sourcing
| Mapping ID | Data attribute | Source system | Source table and column | Destination table and column | Transformation logic | IT lead |
| --- | --- | --- | --- | --- | --- | --- |
| DS-01 | DA-01 | ASSUMPTION: application-submission system; name not provided. | ASSUMPTION: source table and borrower-name column not provided. | ASSUMPTION: policy-check record table.borrower_name | Direct copy | ASSUMPTION: IT lead not identified. |
| DS-02 | DA-02 | ASSUMPTION: application-submission system; name not provided. | ASSUMPTION: source table and loan-ID column not provided. | ASSUMPTION: policy-check record table.loan_id | Direct copy; permit a missing loan ID for migrated rows. [BRD FR-24] | ASSUMPTION: IT lead not identified. |
| DS-03 | DA-03 | ASSUMPTION: application-submission system; name not provided. | ASSUMPTION: source table and amount column not provided. | ASSUMPTION: policy-check record table.amount | Direct copy | ASSUMPTION: IT lead not identified. |
| DS-04 | DA-04 | ASSUMPTION: application-submission system; name not provided. | ASSUMPTION: source table and collateral-type column not provided. | ASSUMPTION: policy-check record table.collateral_type | Direct copy | ASSUMPTION: IT lead not identified. |
| DS-05 | DA-05 | ASSUMPTION: application-submission system; name not provided. | ASSUMPTION: source table and DSCR column not provided. | ASSUMPTION: policy-check record table.dscr | Direct copy | ASSUMPTION: IT lead not identified. |
| DS-06 | DA-06 | ASSUMPTION: application-submission system; name not provided. | ASSUMPTION: source table and LTV column not provided. | ASSUMPTION: policy-check record table.ltv | Direct copy | ASSUMPTION: IT lead not identified. |
| DS-07 | DA-07 | ASSUMPTION: application-submission system; name not provided. | ASSUMPTION: source table and existing-exposure column not provided. | ASSUMPTION: policy-check record table.existing_exposure | Direct copy | ASSUMPTION: IT lead not identified. |
| DS-08 | DA-08 | ASSUMPTION: application-submission system; name not provided. | ASSUMPTION: source table and risk-rating column not provided. | ASSUMPTION: policy-check record table.risk_rating | Direct copy | ASSUMPTION: IT lead not identified. |
| DS-09 | DA-09 | Legacy Excel checklist. | legacy-policy-checklist.csv; submitted | ASSUMPTION: policy-check history table.submitted_date | Direct copy | ASSUMPTION: IT lead not identified. |
| DS-10 | DA-10 | Legacy Excel checklist. | legacy-policy-checklist.csv; result | ASSUMPTION: policy-check history table.legacy_result | Direct copy | ASSUMPTION: IT lead not identified. |
| DS-11 | DA-11 | Legacy Excel checklist. | legacy-policy-checklist.csv; checked_by | ASSUMPTION: policy-check history table.checker | Direct copy | ASSUMPTION: IT lead not identified. |
| DS-12 | DA-12 | ASSUMPTION: application-submission system; name not provided. | ASSUMPTION: source table.amount and source table.existing_exposure; source table names not provided. | ASSUMPTION: policy-check record table.total_borrower_exposure | Add amount to existing exposure for the same borrower. [BRD FR-04] | ASSUMPTION: IT lead not identified. |
| DS-13 | DA-13 | ASSUMPTION: policy-check system; name not provided. | DA-05 source value. | ASSUMPTION: policy-check result table.dscr_outcome | Set Pass when DSCR is at least 1.25x; otherwise set Fail. [BRD FR-02] | ASSUMPTION: IT lead not identified. |
| DS-14 | DA-14 | ASSUMPTION: policy-check system; name not provided. | DA-04 and DA-06 source values. | ASSUMPTION: policy-check result table.ltv_outcome | When collateral is real estate, set Pass when LTV is at most 75%; otherwise set Fail. Do not infer the outcome for other collateral types; handling is unresolved. [BRD FR-03; intake Q3] | ASSUMPTION: IT lead not identified. |
| DS-15 | DA-15 | ASSUMPTION: policy-check system; name not provided. | DA-12 source value. | ASSUMPTION: policy-check result table.exposure_outcome | Set Pass when total borrower exposure is at most $10M; otherwise set Fail. [BRD FR-04] | ASSUMPTION: IT lead not identified. |
| DS-16 | DA-16 | ASSUMPTION: policy-check system; name not provided. | DA-08 source value. | ASSUMPTION: policy-check result table.risk_rating_outcome | Treat ratings 1 to 6 as eligible; treat a rating of 7 or worse as declined, without an exception path. [BRD FR-05; BRD FR-06] | ASSUMPTION: IT lead not identified. |
| DS-17 | DA-17 | ASSUMPTION: policy-check system; name not provided. | DA-05 and DA-25 source values. | ASSUMPTION: policy-check result table.dscr_failure_reason | On Fail, identify that DSCR is below 1.25x. Exact display wording is not specified. [BRD FR-02; BRD FR-13] | ASSUMPTION: IT lead not identified. |
| DS-18 | DA-18 | ASSUMPTION: policy-check system; name not provided. | DA-04, DA-06 and DA-26 source values. | ASSUMPTION: policy-check result table.ltv_failure_reason | For real-estate collateral, on Fail identify that LTV exceeds 75%. Exact display wording is not specified. [BRD FR-03; BRD FR-13] | ASSUMPTION: IT lead not identified. |
| DS-19 | DA-19 | ASSUMPTION: policy-check system; name not provided. | DA-12 and DA-27 source values. | ASSUMPTION: policy-check result table.exposure_failure_reason | On Fail, identify that total borrower exposure exceeds $10M. Exact display wording is not specified. [BRD FR-04; BRD FR-13] | ASSUMPTION: IT lead not identified. |
| DS-20 | DA-20 | ASSUMPTION: policy-check system; name not provided. | DA-08 and DA-28 source values. | ASSUMPTION: policy-check result table.risk_rating_failure_reason | On Fail, identify that the rating is 7 or worse and the loan is declined without an exception path. Exact display wording is not specified. [BRD FR-06; BRD FR-13] | ASSUMPTION: IT lead not identified. |
| DS-21 | DA-21 | ASSUMPTION: application-submission system; name not provided. | ASSUMPTION: source table and DSCR column not provided. | ASSUMPTION: policy-check result table.dscr_actual_value | Direct copy from the submitted DSCR. [BRD FR-13] | ASSUMPTION: IT lead not identified. |
| DS-22 | DA-22 | ASSUMPTION: application-submission system; name not provided. | ASSUMPTION: source table and LTV column not provided. | ASSUMPTION: policy-check result table.ltv_actual_value | Direct copy from the submitted LTV. [BRD FR-13] | ASSUMPTION: IT lead not identified. |
| DS-23 | DA-23 | ASSUMPTION: policy-check system; name not provided. | DA-12 source value. | ASSUMPTION: policy-check result table.exposure_actual_value | Direct copy of total borrower exposure. [BRD FR-13] | ASSUMPTION: IT lead not identified. |
| DS-24 | DA-24 | ASSUMPTION: application-submission system; name not provided. | ASSUMPTION: source table and risk-rating column not provided. | ASSUMPTION: policy-check result table.risk_rating_actual_value | Direct copy from the submitted risk rating. [BRD FR-13] | ASSUMPTION: IT lead not identified. |
| DS-25 | DA-25 | Approved BRD policy rule. | BRD FR-02; threshold value 1.25x. | ASSUMPTION: policy-check result table.dscr_limit | Populate with 1.25x. [BRD FR-02] | ASSUMPTION: IT lead not identified. |
| DS-26 | DA-26 | Approved BRD policy rule. | BRD FR-03; threshold value 75%. | ASSUMPTION: policy-check result table.ltv_limit | Populate with 75%. [BRD FR-03] | ASSUMPTION: IT lead not identified. |
| DS-27 | DA-27 | Approved BRD policy rule. | BRD FR-04; threshold value $10M. | ASSUMPTION: policy-check result table.exposure_limit | Populate with $10M. [BRD FR-04] | ASSUMPTION: IT lead not identified. |
| DS-28 | DA-28 | Approved BRD policy rules. | BRD FR-05 and BRD FR-06; eligibility range 1 to 6; decline boundary 7 or worse. | ASSUMPTION: policy-check result table.risk_rating_limit | Populate the eligibility range as 1 to 6 and the decline boundary as 7 or worse. [BRD FR-05; BRD FR-06] | ASSUMPTION: IT lead not identified. |
| DS-29 | DA-29 | RM using the exception request. | ASSUMPTION: exception request input; system, table and column not provided. | ASSUMPTION: exception record table.rm_justification | Direct copy of the RM-entered text. [BRD FR-16] | ASSUMPTION: IT lead not identified. |
| DS-30 | DA-30 | ASSUMPTION: policy-check system; name not provided. | DA-03 loan amount. | ASSUMPTION: exception record table.deciding_role | Assign senior credit officer when amount is above $5M; assign credit officer when amount is $5M or less. [BRD FR-08; BRD FR-09] | ASSUMPTION: IT lead not identified. |
| DS-31 | DA-31 | Credit officer or senior credit officer using the exception request. | ASSUMPTION: exception decision input; system, table and column not provided. | ASSUMPTION: exception record table.exception_decision | Direct copy of the selected “Approve exception” or “Decline” action. [BRD FR-18] | ASSUMPTION: IT lead not identified. |
| DS-32 | DA-01 | Legacy Excel checklist. | legacy-policy-checklist.csv; borrower | ASSUMPTION: policy-check history table.borrower_name | Direct copy | ASSUMPTION: IT lead not identified. |
| DS-33 | DA-02 | Legacy Excel checklist. | legacy-policy-checklist.csv; loan_id | ASSUMPTION: policy-check history table.loan_id | Direct copy; preserve a missing loan ID. [BRD FR-24] | ASSUMPTION: IT lead not identified. |
| DS-34 | DA-03 | Legacy Excel checklist. | legacy-policy-checklist.csv; amount_usd | ASSUMPTION: policy-check history table.amount | Direct copy | ASSUMPTION: IT lead not identified. |
| DS-35 | DA-05 | Legacy Excel checklist. | legacy-policy-checklist.csv; dscr | ASSUMPTION: policy-check history table.dscr | Direct copy | ASSUMPTION: IT lead not identified. |
| DS-36 | DA-06 | Legacy Excel checklist. | legacy-policy-checklist.csv; ltv_pct | ASSUMPTION: policy-check history table.ltv | Direct copy | ASSUMPTION: IT lead not identified. |
| DS-37 | DA-07 | Legacy Excel checklist. | legacy-policy-checklist.csv; existing_exposure_usd | ASSUMPTION: policy-check history table.existing_exposure | Direct copy | ASSUMPTION: IT lead not identified. |
| DS-38 | DA-08 | Legacy Excel checklist. | legacy-policy-checklist.csv; risk_rating | ASSUMPTION: policy-check history table.risk_rating | Direct copy | ASSUMPTION: IT lead not identified. |

## Manual workarounds
| Data attribute | Why it cannot be sourced from a system | Form | Owner in the line of business | Reviewer | Frequency |
| --- | --- | --- | --- | --- | --- |
| None | The material specifies no data attribute that lacks a system source and requires manual entry. | None. | None. | None. | None. |

## Assumptions and open points
- **ASSUMPTION:** The new policy-check system’s name, destination table names, destination column names and physical data types are not provided. Confirm them before implementation. [FDD Impacted systems and tables]
- **ASSUMPTION:** The application-submission source system, source tables and source columns for current application data are not provided. Confirm them before implementation. [BRD System interfaces]
- The legacy file’s worksheet or table name is not provided; mappings use the supplied CSV file and its headers. [FDD Assumptions and open points]
- LTV check and display behavior for collateral types other than real estate is unresolved. [intake Q3]
- Exact text for failed-rule reasons is not specified. [BRD FR-13]
- The required contents of the full check and decision record remain unresolved; the attributes above are limited to fields identified in the requirements. [BRD NFR-05; intake Q10]
- Migration selection must include every legacy checklist row submitted in the three years before go-live; the go-live date and migration timing are not provided. [BRD FR-21; intake Q4]
