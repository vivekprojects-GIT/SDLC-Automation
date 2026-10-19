---
document: SIT QA Strategy
project: Commercial Loan Policy Check
version: "1.0"
status: approved
owner: QA lead
template: standard/sit-strategy.md
generated_by: QA lead agent via GitHub Copilot (copilot/claude-fable-5.1)
approved_by: vivek (QA lead)
approved_at: 2026-10-19T16:19:48.888Z
---

# SIT QA Strategy: Commercial Loan Policy Check

## Purpose and objectives
- Prove that the integrated solution meets the approved BRD requirements through the application submission, policy-check, exception and history-migration flows. [BRD FR-01–FR-24]
- Verify that the policy rules, displayed results, routing, records, access restriction and specified data mappings produce observable, traceable outcomes. [BRD FR-02–FR-20; DSD DS-01–DS-38; TDD TD-01–TD-24]
- Reconcile the migrated three-year checklist population and its specified fields against the source file. [BRD FR-21–FR-24; intake Q4; TDD Legacy checklist migration load]

## Scope
- Cover all BRD functional and non-functional requirements listed below; unresolved acceptance details must be confirmed before the affected tests can run. [BRD Detailed requirements; BRD Non-functional requirements]
- Cover the application-submission interface, exception request and decision load, and legacy checklist migration load. [TDD TD-01; TDD ETL design]
- Cover policy rules, screen data and actions, access restriction, check and decision records, and borrower history. [BRD FR-01–FR-24]
- Do not infer behavior for non-real-estate LTV, unspecified input validation, error recovery, audit fields, retention, privacy controls or accessibility criteria. Confirm these before testing the affected behavior. [intake Q3; intake Q7–Q10; FDD Screens and user interactions; TDD Error handling and recovery]
- Reports are not in scope because no report format or frequency is specified. [BRD Report requirements]

## Requirements in scope
| BRD ID | Requirement | In SIT scope | Reason |
| --- | --- | --- | --- |
| FR-01 | Start a policy check when an RM submits an application for policy checking. [BRD FR-01] | Yes | Verify the submission action invokes the policy-check flow. [TDD TD-01; TDD Submission-triggered policy-check load] |
| FR-02 | Pass DSCR when it is at least 1.25x. [BRD FR-02] | Yes | Verify the rule at the limit and on either side, using the approved data precision. [DSD DS-13; TDD TD-02] |
| FR-03 | For real-estate collateral, pass LTV when it is at most 75%. [BRD FR-03] | Yes | Verify the rule at the limit and on either side; non-real-estate handling remains unresolved. [DSD DS-14; intake Q3; TDD TD-03] |
| FR-04 | Pass exposure when total borrower exposure, including existing loans, is at most $10M. [BRD FR-04] | Yes | Verify amount plus existing exposure, including the limit and values on either side. [DSD DS-12; DSD DS-15; TDD TD-04] |
| FR-05 | Treat risk ratings from 1 to 6 as eligible. [BRD FR-05] | Yes | Verify ratings at the eligibility boundaries and within the stated range. [DSD DS-16; TDD TD-05] |
| FR-06 | Decline a loan with a risk rating of 7 or worse, without an exception path. [BRD FR-06; intake Q2] | Yes | Verify rating 7 and worse ratings supported by the approved input domain; confirm no exception action is available. [DSD DS-16; TDD TD-06] |
| FR-07 | Require an exception decision before a non-declined loan with a failed rule can proceed. [BRD FR-07; intake Q2] | Yes | Verify the gate before a decision and the recorded decision flow. [TDD TD-07] |
| FR-08 | Assign an exception decision to a senior credit officer when the loan amount is above $5M. [BRD FR-08; intake Q1] | Yes | Verify routing above $5M using approved amount precision. [DSD DS-30; TDD TD-08] |
| FR-09 | Assign an exception decision to a credit officer when the loan amount is $5M or less. [BRD FR-09; intake Q1] | Yes | Verify routing at $5M and below using approved amount precision. [DSD DS-30; TDD TD-09] |
| FR-10 | Show borrower name, loan ID, amount, collateral type, DSCR, LTV, existing exposure and risk rating on the application summary. [BRD FR-10] | Yes | Compare each displayed value with the submitted application data. [FDD FD-10; TDD TD-10] |
| FR-11 | Provide a “Submit for policy check” action on the application summary. [BRD FR-11] | Yes | Verify the action is present and starts the submission flow. [FDD FD-11; TDD TD-11] |
| FR-12 | Show a Pass or Fail row for each DSCR, LTV, exposure and risk rating rule. [BRD FR-12] | Yes | Verify all four rule rows and their outcomes. [FDD FD-12; TDD TD-12] |
| FR-13 | For each failed rule, show the reason, actual value and limit. [BRD FR-13] | Yes | Compare the displayed fields with the failed rule data; exact reason wording is not specified. [DSD DS-17–DS-28; TDD TD-13] |
| FR-14 | Show “Request exception” only when a rule fails and the loan is not declined. [BRD FR-14; intake Q2] | Yes | Verify visibility for eligible failures and absence when no rule fails or the loan is declined. [TDD TD-14] |
| FR-15 | Show failed rules and their reasons on the exception request. [BRD FR-15] | Yes | Compare exception-request details with the policy results. [FDD FD-15; TDD TD-15] |
| FR-16 | Provide an RM justification text box on the exception request. [BRD FR-16] | Yes | Verify the field is available and entered text is persisted; input validation is unspecified. [DSD DS-29; TDD TD-16] |
| FR-17 | Identify the deciding role as credit officer or senior credit officer on the exception request. [BRD FR-17] | Yes | Verify the displayed role matches the loan-amount routing rule. [DSD DS-30; TDD TD-17] |
| FR-18 | Provide “Approve exception” and “Decline” actions. [BRD FR-18] | Yes | Verify both actions and persistence of the selected decision. [DSD DS-31; TDD TD-18] |
| FR-19 | Keep a full record of every policy check and every decision. [BRD FR-19] | Yes | Verify a record exists for each check and decision; required record contents remain to be confirmed. [BRD NFR-05; TDD TD-19; intake Q10] |
| FR-20 | Restrict policy-check results to RMs and credit staff. [BRD FR-20] | Yes | Verify access for permitted groups and denial for users outside those groups; role setup requires confirmation. [BRD NFR-01; TDD TD-20; intake Q6] |
| FR-21 | Migrate every legacy checklist row submitted in the three years before go-live. [BRD FR-21; intake Q4] | Yes | Reconcile the selected source population to loaded history; go-live date must be supplied. [TDD TD-21] |
| FR-22 | Migrate loan ID, borrower, submitted date, amount, DSCR, LTV, existing exposure, risk rating, result and checker. [BRD FR-22] | Yes | Compare every specified mapped field between source and target. [DSD DS-09–DS-11; DSD DS-32–DS-38; TDD TD-22] |
| FR-23 | Make migrated checklist history available to show a borrower’s history. [BRD FR-23] | Yes | Verify migrated history can be found and displayed; lookup method and screen require confirmation. [TDD TD-23] |
| FR-24 | Migrate a legacy checklist row that has no loan ID. [BRD FR-24] | Yes | Verify a source row with a missing loan ID is loaded and the missing value is preserved. [DSD DS-33; TDD TD-24] |
| NFR-01 | Restrict policy-check results to RMs and credit staff. [BRD NFR-01] | Yes | Covered with FR-20; confirm role definitions and test accounts before execution. [intake Q6] |
| NFR-02 | Protect borrower financial details from access beyond permitted groups; privacy controls are to be confirmed. [BRD NFR-02] | Yes | Test only the privacy controls after they are approved and made measurable; otherwise this coverage is blocked. [intake Q7] |
| NFR-03 | Retain checks, decisions and migrated checklist records for a period to be confirmed. [BRD NFR-03] | Yes | Verify the approved retention period only after it is specified; no duration is inferred. [intake Q8] |
| NFR-04 | Meet accessibility requirements to be confirmed. [BRD NFR-04] | Yes | Test against approved accessibility criteria once supplied; criteria are currently unresolved. [intake Q9] |
| NFR-05 | Keep a full record of every check and decision; required contents are to be confirmed. [BRD NFR-05] | Yes | Verify records exist for each check and decision; verify detailed contents only after approval. [TDD TD-19; intake Q10] |
| NFR-06 | Return policy-check results within 3 seconds of submission. [BRD NFR-06] | Yes | Measure submission-to-result time against 3 seconds; confirm the measurement points and test conditions before execution. [intake Q5] |

## Test approach
- Derive cases from BRD requirements and FDD screens, then trace each case to the relevant DSD mappings and TDD components. [FDD FD-01–FD-24; DSD DS-01–DS-38; TDD TD-01–TD-24]
- Run functional tests for submission, rules, results, exception eligibility, routing, decisions, records, access and borrower history. [BRD FR-01–FR-20; BRD FR-23]
- Run integration tests across the submission interface, exception request and decision load, and legacy migration load. Verify source-to-target values and observable results. [TDD TD-01; TDD ETL design; DSD Data sourcing]
- For DSCR, real-estate LTV, exposure and loan-amount routing, test the exact limit and the nearest representable value on either side once field precision is approved. Test risk ratings 1, 6, 7 and a supported value worse than 7. [BRD FR-02–FR-09; DSD DA-03–DA-08]
- Include positive, failed-rule, multiple-failure and declined-loan scenarios. Verify failed-rule reason, actual value and limit; do not invent exact reason text. [BRD FR-12–FR-15; DSD DS-17–DS-28]
- Run migration testing for the three-year selection window, every specified field, borrower history availability and a row without a loan ID. Reconcile selected source rows to loaded rows and compare mapped values. [BRD FR-21–FR-24; DSD DS-09–DS-11; DSD DS-32–DS-38]
- Run regression on affected submission, rules, exception, record and migration flows after fixes. [TDD TD-01–TD-24]
- Test access restriction and the 3-second result requirement. Test privacy, retention and accessibility only against approved criteria. [BRD NFR-01–NFR-06; intake Q5–Q9]
- Do not test unspecified input validation, non-real-estate LTV behavior or unapproved recovery behavior as acceptance requirements. [FDD Screens and user interactions; intake Q3; TDD Error handling and recovery]

## Test environments
| Environment | Purpose | Systems and versions | Test data |
| --- | --- | --- | --- |
| SIT integrated environment | Exercise the end-to-end submission, policy-check, exception and decision flows. [TDD Solution overview] | Application-submission system and new policy-check system; names, versions and environment details are not provided and must be confirmed. [BRD System interfaces; TDD Assumptions and open points] | Synthetic application cases covering rules, boundaries, routing and access; exact representable boundary values require approved data precision. [BRD FR-01–FR-20; DSD DA-01–DA-31] |
| SIT migration environment | Run and reconcile the one-time legacy checklist load before go-live. [TDD Legacy checklist migration load] | Legacy checklist file and new policy-check system; versions and physical target objects are not provided and must be confirmed. [TDD ETL design; DSD Assumptions and open points] | Approved, protected copy of the legacy file with the agreed three-year selection window; include a row with no loan ID. Do not use personal or confidential values in test evidence. [BRD FR-21–FR-24; intake Q4] |

## Test data
- Use synthetic application data for borrower name, loan ID, amount, collateral type, DSCR, LTV, existing exposure and risk rating. [BRD FR-10; DSD DA-01–DA-08]
- Prepare cases at 1.25x DSCR, 75% real-estate LTV, $10M total borrower exposure and $5M loan amount, plus the nearest representable values above or below each applicable limit. Confirm precision before preparing boundary values. [BRD FR-02–FR-04; BRD FR-08–FR-09; DSD DA-03–DA-07]
- Prepare eligible risk ratings 1 to 6 and decline cases at 7 or worse. [BRD FR-05–FR-06]
- Prepare passing, single-failure, multiple-failure and declined applications to verify results and exception visibility. [BRD FR-12–FR-15]
- Prepare RM and credit-staff test accounts, plus an account outside those groups, after access roles are confirmed. [BRD FR-20; intake Q6]
- Use an approved migration source extract, the confirmed three-year cutoff and a target baseline. Reconcile row counts and each specified field, including the row without a loan ID. [BRD FR-21–FR-24; DSD DS-09–DS-11; DSD DS-32–DS-38]
- Protect borrower data by using synthetic data for functional tests and a suitably protected, approved migration copy for migration tests. Mask or omit personal and confidential values from test evidence. [BRD NFR-02; intake Q7; ASSUMPTION: test data handling controls must be approved before migration testing.]

## Entry criteria
- The SIT build and required systems are deployed and available; the system names, versions, endpoints and physical target objects are documented. [TDD Assumptions and open points]
- The submission interface contract and source fields for current application data are approved and available for testing. [BRD System interfaces; DSD Assumptions and open points]
- The migration source file, go-live date, three-year selection cutoff and target schema are approved. [BRD FR-21; intake Q4; TDD TD-21]
- Business owners approve handling for non-real-estate LTV, and the FDD screen designs used for acceptance are confirmed. [intake Q3; intake Q11]
- Approved criteria are recorded for unresolved privacy, retention, accessibility, audit-record contents and access roles before tests for those items begin. [BRD NFR-01–NFR-05; intake Q6–Q10]
- Data precision for DSCR, LTV, exposure and loan amount is documented so boundary values can be selected objectively. [DSD DA-03; DSD DA-05–DA-07]
- The 3-second measurement points and test conditions are agreed and documented. [BRD NFR-06; intake Q5]
- Test cases and a requirement traceability matrix cover every in-scope BRD ID. [BRD Detailed requirements; BRD Non-functional requirements]
- Synthetic test data, approved migration data and required role-based test accounts are available. [BRD FR-10; BRD FR-20–FR-24]

## Exit criteria
- Every approved SIT case for every in-scope requirement has been run, and results are recorded against the requirement traceability matrix. [BRD Detailed requirements; BRD Non-functional requirements]
- All executed mandatory cases pass; each failure is linked to a defect or approved requirement clarification. [ASSUMPTION: all mandatory SIT cases must pass for exit.]
- No open Severity 1 or Severity 2 defects remain; any Severity 3 defect has a documented disposition approved by the business owner and QA lead. [ASSUMPTION: severity scale and exit thresholds require project approval.]
- Regression cases affected by fixes have been rerun and passed. [ASSUMPTION: regression scope is selected by QA lead based on the fix impact.]
- Migration reconciliation shows the selected source-row count equals the loaded-row count, and every specified migrated field matches its source value, including the missing loan ID case. [BRD FR-21–FR-24; DSD Data sourcing]
- Access tests show policy-check results available to RMs and credit staff and denied to the tested account outside those groups. [BRD FR-20; BRD NFR-01]
- Policy-check results meet the 3-second requirement under the approved test conditions. [BRD NFR-06]
- All unresolved criteria that block in-scope testing have approved decisions, and no in-scope requirement remains untested without a documented, approved reason. [BRD NFR-02–NFR-05; intake Q3; intake Q6–Q11]

## Defect management
- Record each defect with a unique identifier, affected requirement and test case, environment, reproducible steps, actual result, expected result and evidence. [ASSUMPTION: defect tracking tool and required fields are not specified.]
- Use this proposed severity scale, subject to approval: Severity 1 means a critical flow is blocked or results are materially incorrect with no workaround; Severity 2 means a required flow or control fails with no acceptable workaround; Severity 3 means a limited failure with a documented workaround; Severity 4 means a minor issue with no material effect on required behavior. [ASSUMPTION: severity definitions are not specified in the approved documents.]
- Hold triage with the QA lead, delivery or technical lead, and business owner; confirm severity, priority, owner and target fix. Named owners are not provided. [ASSUMPTION: triage roles and cadence require confirmation.]
- The delivery or technical lead fixes the defect; the tester retests the failed case and runs related regression cases. [ASSUMPTION: fix and retest responsibilities require confirmation.]
- The QA lead recommends SIT exit; the business owner accepts business-impacting residual defects, and the project manager confirms schedule impact. [ASSUMPTION: decision authority requires confirmation.]

## Roles and responsibilities
| Role | Responsibility |
| --- | --- |
| QA lead | Approve SIT cases and evidence, manage traceability and defects, report readiness and recommend exit. [ASSUMPTION: role allocation; project information identifies the QA lead as document owner.] |
| SIT testers | Execute approved cases, capture evidence, raise defects and retest fixes. [ASSUMPTION: role allocation.] |
| Business owner or policy representative | Confirm policy interpretations, unresolved acceptance criteria and business disposition of residual defects. [ASSUMPTION: named system business owners are not identified; BRD Stakeholders.] |
| Application-submission system lead | Provide the submission interface, source data and support for integration testing. [ASSUMPTION: system name and IT lead are not provided; BRD System interfaces.] |
| Policy-check system delivery lead | Provide the SIT build, rules, screens, records and access configuration; investigate and fix defects. [ASSUMPTION: system name and IT lead are not provided; BRD Impacted systems.] |
| Data migration lead | Provide the migration job, source population, mappings and reconciliation evidence. [ASSUMPTION: named IT lead is not provided; DSD Data sourcing.] |
| Project manager | Coordinate dependencies, schedule and escalation. [ASSUMPTION: role allocation; BRD Stakeholders identifies the project manager as a stakeholder.] |

## Schedule and dependencies
- No dates, durations or named delivery teams are provided; the project manager and QA lead must baseline the schedule before execution. [BRD Requirement sessions; TDD Assumptions and open points]
- **Preparation:** confirm unresolved acceptance criteria, interface contracts, schemas, data precision, roles and test data. These are prerequisites to the affected tests. [FDD Assumptions and open points; DSD Assumptions and open points; TDD Assumptions and open points]
- **Environment and build readiness:** deploy the submission interface, policy rules, screens, exception flow, records and access controls to the SIT environment. [TDD Deployment considerations]
- **Functional and integration execution:** test submission-triggered checks and exception requests and decisions after the relevant systems and interfaces are available. [TDD ETL design]
- **Migration execution and reconciliation:** run the one-time load after the legacy file, target schema and three-year cutoff are approved; complete before go-live. [TDD Legacy checklist migration load; intake Q4]
- **Regression and exit review:** rerun impacted cases after fixes, reconcile evidence to requirements and present exit status to the decision-makers. [ASSUMPTION: phase order and approval workflow require project confirmation.]
- Dependencies include application-submission data availability, policy-check deployment, agreed role access, approved migration source and target, and confirmation of open design points. [TDD ETL design; TDD Assumptions and open points]

## Risks and mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Submission interface contract, source system details and physical schemas are not supplied. [BRD System interfaces; TDD Assumptions and open points] | SIT cannot establish reliable integration or data assertions. | Obtain and approve interface contracts, source fields and target mappings before affected tests start. |
| LTV handling for non-real-estate collateral is unresolved. [intake Q3; DSD DS-14] | Results for those applications cannot be judged consistently. | Obtain an approved rule and expected display before testing those cases; do not infer behavior. |
| Migration cutoff depends on an unprovided go-live date, and migration reconciliation criteria are not specified. [intake Q4; TDD Deployment considerations] | The selected population or completeness verdict may be disputed. | Approve the go-live date, cutoff, source population and reconciliation method before the migration run. |
| Access roles, privacy controls, retention, accessibility and audit-record contents are unresolved. [intake Q6–Q10] | Required controls cannot be tested objectively. | Obtain measurable approved criteria and test accounts before testing the affected requirements. |
| Data precision and physical types are not specified. [DSD DA-01–DA-31] | Boundary tests may not use the true nearest representable values. | Approve field types, precision and scale before preparing boundary data. |
| Figma descriptions are samples and real frame exports are not confirmed. [intake Q11] | Screen-level acceptance may be ambiguous. | Confirm the approved screen designs before testers assess layout or wording beyond stated requirements. |
| Error recovery and operational support details are assumptions in the TDD. [TDD Error handling and recovery] | Failure and restart tests may lack approved expected outcomes. | Obtain approved recovery behavior, support ownership and alert details before adding those tests. |
| System and IT lead names are not identified. [BRD Stakeholders; BRD Impacted systems] | Defect resolution and environment support may be delayed. | Assign named system, business and migration owners before SIT execution. |
