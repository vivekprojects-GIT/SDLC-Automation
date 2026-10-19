---
document: UAT QA Strategy
project: Commercial Loan Policy Check
version: "1.0"
status: approved
owner: UAT lead
template: standard/uat-strategy.md
generated_by: UAT lead agent via GitHub Copilot (copilot/claude-fable-5.1)
approved_by: vivek (UAT lead)
approved_at: 2026-10-19T16:21:18.849Z
---

# UAT QA Strategy: Commercial Loan Policy Check

## Purpose and objectives
- Confirm through business-led evidence that the policy-check, exception and history processes support the approved requirements before go-live. [BRD FR-01–FR-24]
- Confirm business users can understand the results, take the required actions and find migrated borrower history. [BRD FR-10–FR-18; FR-23]
- Give the business owners evidence to accept each process or record a reason for not accepting it. [ASSUMPTION: business acceptance will be recorded against UAT evidence.]

## Scope
- Accept the business flows for application policy checks, exception decisions, check and decision records, access to results, and checklist-history migration. [BRD FR-01–FR-24]
- Include each BRD requirement in UAT scope; requirements whose acceptance details are unresolved cannot be tested until those details are approved. [BRD NFR-02–NFR-06; intake Q3; Q6–Q11]
- Do not repeat technical integration testing. SIT exit evidence is a UAT entry requirement. [SIT QA Strategy §Exit criteria]
- No report testing is planned because no reports are specified. [BRD Report requirements]

## Requirements in scope
| BRD ID | Requirement | In UAT scope | Reason |
| --- | --- | --- | --- |
| FR-01 | Start a policy check when an RM submits an application for policy checking. [BRD FR-01] | Yes | Accept the application submission flow from the RM’s perspective. |
| FR-02 | Pass the DSCR rule when DSCR is at least 1.25x. [BRD FR-02] | Yes | Accept the business rule using cases at and around the stated limit. |
| FR-03 | For real-estate collateral, pass the LTV rule when LTV is at most 75%. [BRD FR-03] | Yes | Accept the stated rule for real-estate collateral; non-real-estate handling remains unresolved. [intake Q3] |
| FR-04 | Pass the exposure rule when total exposure to one borrower, including existing loans, is at most $10M. [BRD FR-04] | Yes | Accept the stated rule using total borrower exposure. |
| FR-05 | Treat a risk rating from 1 to 6 as eligible. [BRD FR-05] | Yes | Accept the stated eligibility range. |
| FR-06 | Decline a loan with a risk rating of 7 or worse, without an exception path. [BRD FR-06; intake Q2] | Yes | Accept the decline outcome and absence of an exception path. |
| FR-07 | Require an exception decision before a loan can proceed when a rule fails and the loan is not declined. [BRD FR-07; intake Q2] | Yes | Accept the business decision gate. |
| FR-08 | Assign an exception decision to a senior credit officer when the loan amount is above $5M. [BRD FR-08; intake Q1] | Yes | Accept the stated decision routing. |
| FR-09 | Assign an exception decision to a credit officer when the loan amount is $5M or less. [BRD FR-09; intake Q1] | Yes | Accept the stated decision routing. |
| FR-10 | Show borrower name, loan ID, amount, collateral type, DSCR, LTV, existing exposure to the borrower and risk rating on the application summary. [BRD FR-10] | Yes | Accept the information visible to the RM. |
| FR-11 | Provide a “Submit for policy check” action on the application summary. [BRD FR-11] | Yes | Accept the action in the business flow. |
| FR-12 | Show a Pass or Fail outcome for each DSCR, LTV, exposure and risk rating rule. [BRD FR-12] | Yes | Accept the displayed outcomes for all four rules. |
| FR-13 | For each failed rule, show its reason, actual value and limit. [BRD FR-13] | Yes | Accept the failed-rule information shown to the user. |
| FR-14 | Show “Request exception” only when a rule fails and the loan is not declined. [BRD FR-14; intake Q2] | Yes | Accept when the action is available and when it is absent. |
| FR-15 | Show failed rules and their reasons on the exception request. [BRD FR-15] | Yes | Accept the information carried into the request. |
| FR-16 | Provide an RM justification text box on the exception request. [BRD FR-16] | Yes | Accept the RM’s ability to enter a justification. |
| FR-17 | Identify the deciding role as credit officer or senior credit officer on the exception request. [BRD FR-17; intake Q1] | Yes | Accept the displayed deciding role against the loan amount. |
| FR-18 | Provide “Approve exception” and “Decline” actions. [BRD FR-18] | Yes | Accept the decision actions and resulting decision. |
| FR-19 | Keep a full record of every policy check and every decision. [BRD FR-19] | Yes | Accept evidence that the check and decision records are retained; required record contents must be confirmed. [NFR-05; intake Q10] |
| FR-20 | Restrict policy-check results to RMs and credit staff. [BRD FR-20] | Yes | Accept access for the stated groups and denial for a test user outside them. |
| FR-21 | Migrate every legacy checklist row submitted in the three years before go-live. [BRD FR-21; intake Q4] | Yes | Accept the history population against an approved cutoff and source reconciliation. |
| FR-22 | Migrate the legacy checklist fields loan ID, borrower, submitted date, amount, DSCR, LTV, existing exposure, risk rating, result and checker. [BRD FR-22] | Yes | Accept the specified fields against approved migration evidence. |
| FR-23 | Make migrated checklist history available to show a borrower’s history. [BRD FR-23; intake Q4] | Yes | Accept that users can find and view migrated borrower history; the lookup method must be confirmed. |
| FR-24 | Migrate a legacy checklist row that has no loan ID. [BRD FR-24] | Yes | Accept migration of the row with the missing loan ID. |
| NFR-01 | Restrict policy-check results to RMs and credit staff; further access controls require confirmation. [BRD NFR-01; intake Q6] | Yes | Accept the stated restriction; additional controls require approved criteria before testing. |
| NFR-02 | ASSUMPTION: Protect borrower financial details from access beyond permitted groups; privacy controls are to be confirmed. [BRD NFR-02; intake Q7] | Yes | Test only after privacy controls and expected outcomes are approved. |
| NFR-03 | ASSUMPTION: Retain checks, decisions and migrated checklist records for a period to be confirmed. [BRD NFR-03; intake Q8] | Yes | Test only after the retention period is approved. |
| NFR-04 | ASSUMPTION: Meet accessibility requirements to be confirmed. [BRD NFR-04; intake Q9] | Yes | Test only against approved accessibility criteria. |
| NFR-05 | Keep a full record of every check and decision; required contents are to be confirmed. [BRD NFR-05; intake Q10] | Yes | Accept record existence; test detailed contents only after they are approved. |
| NFR-06 | ASSUMPTION: Return policy-check results within 3 seconds of submission. [BRD NFR-06; intake Q5] | Yes | Test against 3 seconds after measurement points and conditions are approved. |

## Business processes to accept
| Process | Requirements | Business owner |
| --- | --- | --- |
| Submit an application and review policy results | FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-10, FR-11, FR-12, FR-13, FR-14 | RM lead [BRD Stakeholders] |
| Request and decide an exception | FR-07, FR-08, FR-09, FR-15, FR-16, FR-17, FR-18 | Credit lead [BRD Stakeholders] |
| Review check and decision records and access to results | FR-19, FR-20 | Credit lead [ASSUMPTION: business owner for records and access must be confirmed.] |
| Find and review migrated borrower history | FR-21, FR-22, FR-23, FR-24 | Credit lead [ASSUMPTION: business owner for migration acceptance must be confirmed; credit lead proposed migration of checklist history. BRD Stakeholders; kickoff-call-transcript.txt 12:40] |

## Participants and roles
| Role | Who | Responsibility |
| --- | --- | --- |
| UAT lead | UAT lead; name not provided [Project information] | Coordinate UAT, maintain requirement coverage and evidence, manage defects, and prepare the acceptance summary. |
| RM testers | RMs; individual participants not provided [ASSUMPTION] | Run application submission and policy-result scenarios; raise and retest defects. |
| Credit testers | Credit officers and senior credit officers; individual participants not provided [BRD FR-08; FR-09] | Run exception decision scenarios and review check records and borrower history. |
| Business process owners and sign-off owners | RM lead for application checks; credit lead for exceptions; credit lead provisionally for records, access and migration [BRD Stakeholders; ASSUMPTION for provisional assignments] | Confirm expected business outcomes, review evidence, accept or reject each process, and record residual defect decisions. |
| UAT support | Policy-check system and migration support leads; names not provided [ASSUMPTION] | Prepare the UAT build and data, support access and investigate defects. Business users do not perform technical diagnosis. |
| Project manager | Project manager; name not provided [BRD Stakeholders] | Coordinate UAT dependencies and schedule decisions. |

## Approach
- Business users run end-to-end flows using the application summary, the “Submit for policy check” action, results, and exception actions. [BRD FR-01; FR-10–FR-18]
- Use prepared cases for passing rules, failed rules, multiple failed rules, and a declined loan. Check the displayed Pass or Fail outcomes, and for failed rules check the reason, actual value and limit. [BRD FR-02–FR-06; FR-12–FR-14]
- Check routing at the stated $5M threshold and confirm the deciding role shown on the exception request. [BRD FR-08; FR-09; FR-17]
- Credit users review evidence that each check and decision has a record. The method and required record contents must be agreed before UAT; no report format or frequency is specified. [BRD FR-19; NFR-05; BRD Report requirements; intake Q10]
- Review migration reconciliation for the approved three-year population and specified fields, including a row without a loan ID; then find and review borrower history. [BRD FR-21–FR-24; intake Q4]
- No report checks are planned because the BRD specifies no reports. [BRD Report requirements]
- Record each executed case, result, supporting evidence, tester and linked requirement. [ASSUMPTION: UAT evidence repository and format must be agreed before execution.]

## UAT environment and data
- Use a designated UAT environment with the application submission and policy-check flows available. Environment name, system versions and access setup are not provided and must be confirmed. [BRD System interfaces; ASSUMPTION]
- Use synthetic application data for business-flow tests, covering the stated rules and thresholds. Confirm field precision before preparing boundary cases. [BRD FR-02–FR-09; ASSUMPTION: synthetic data will be available.]
- Use RM, credit officer and senior credit officer test access, plus a test user outside the permitted groups. Confirm role setup before testing access. [BRD FR-08; FR-09; FR-20; intake Q6]
- Use an approved, protected migration copy and approved three-year cutoff. Do not include personal or confidential values in UAT evidence. [BRD FR-21–FR-24; intake Q4; ASSUMPTION: approved data-handling controls must be confirmed.]
- Confirm the borrower-history lookup method, migration reconciliation evidence and how users can observe check and decision records before UAT begins. [BRD FR-19; FR-23; NFR-05; intake Q10]

## Entry criteria
- SIT exit is recorded as met and approved. Evidence must show all approved mandatory SIT cases passed, no open Severity 1 or Severity 2 defects, migration reconciliation completed, and the SIT exit criteria met. [SIT QA Strategy §Exit criteria]
- The UAT build and required business flows are available in the agreed UAT environment. [ASSUMPTION: build readiness confirmation will be recorded.]
- UAT cases and a traceability record cover every requirement marked Yes in the Requirements in scope table. [ASSUMPTION: UAT lead maintains the traceability record.]
- RM and credit test users are available, and permitted and non-permitted access roles are confirmed. [BRD FR-20; intake Q6]
- Approved synthetic application cases and protected migration data are available, including the source population and confirmed three-year cutoff. [BRD FR-21–FR-24; intake Q4]
- Acceptance details are approved for non-real-estate LTV, privacy controls, retention, accessibility, record contents, and the 3-second measurement conditions before testing those items. [intake Q3; Q5–Q10]
- Business owners and sign-off owners are confirmed for each process in the Business processes to accept table. [ASSUMPTION: confirmation is required because some ownership assignments are provisional.]

## Exit and sign-off criteria
- Every UAT case linked to an in-scope requirement has a recorded result and evidence; every requirement is either accepted or has a documented, approved reason it could not be tested. [ASSUMPTION: evidence is stored in the agreed UAT repository.]
- All mandatory UAT cases pass. Any failed case is linked to a defect or an approved requirement clarification. [ASSUMPTION: mandatory-case pass is required for exit.]
- No open Severity 1 or Severity 2 defects remain. Any open lower-severity defect has a documented workaround or disposition accepted by the relevant business owner. [ASSUMPTION: severity definitions and disposition process must be agreed before UAT.]
- Migration evidence shows the approved source population and loaded population reconcile, all specified fields match, and the row without a loan ID is included. [BRD FR-21–FR-24]
- Access evidence shows results are available to the tested RM and credit users and unavailable to the tested user outside those groups. [BRD FR-20; NFR-01]
- The RM lead signs off the application-check process, and the credit lead signs off the exception process. The credit lead signs off records, access and migration only after that ownership is confirmed. Sign-off is recorded against the UAT evidence and residual defect list. [BRD Stakeholders; ASSUMPTION for records, access and migration ownership]
- The overall business acceptance decision is signed by the designated business owner for the policy-check solution; that role is not identified in the approved material and must be assigned before UAT sign-off. [BRD Stakeholders; ASSUMPTION]

## Defect management
- Business testers raise defects through the agreed UAT tracking method and include the affected requirement, case, steps, expected and actual result, and evidence. [ASSUMPTION: tracking method and required fields must be agreed.]
- Triage includes the UAT lead, relevant business owner and support lead. They record severity, business impact, owner and disposition. [ASSUMPTION: triage participants and cadence must be confirmed.]
- Proposed severity levels, subject to business approval: Severity 1 blocks a critical business flow or produces materially incorrect results with no workaround; Severity 2 blocks a required flow or control with no acceptable workaround; Severity 3 has a documented workaround; Severity 4 has no material effect on required behavior. [ASSUMPTION: severity scale is not specified in the approved documents.]
- Support leads investigate and fix defects; the business tester retests the failed case and relevant related cases. [ASSUMPTION: support and retest assignments must be confirmed.]
- Business owners decide whether lower-severity residual defects are acceptable and record the decision in the sign-off evidence. [ASSUMPTION: residual defect authority must be confirmed.]

## Schedule
- No UAT dates or durations are provided. The project manager and UAT lead must agree and record them before execution. [BRD Requirement sessions]
- Preparation: confirm owners, acceptance details, UAT cases, environment, access and data.
- UAT entry: verify the approved SIT exit evidence and all other entry criteria.
- Business execution: run application-check, exception, records/access and migration-history flows.
- Defect correction and retest: triage defects, retest fixes and run related business cases.
- Exit and sign-off: review requirement evidence, unresolved defects and process-owner decisions.
- Migration testing depends on an approved source population and three-year cutoff; testing of unresolved NFRs depends on approved measurable criteria. [BRD FR-21–FR-24; intake Q4–Q10]

## Risks and mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Business owners for records, access, migration and overall solution acceptance are not fully identified. [BRD Stakeholders; ASSUMPTION] | UAT decisions or final sign-off may be delayed or disputed. | Assign and record a sign-off owner for each process before UAT entry. |
| Non-real-estate LTV behavior remains unresolved. [intake Q3] | Users cannot judge results for those applications consistently. | Approve the expected business behavior before testing affected cases; do not infer a rule. |
| Access, privacy, retention and accessibility criteria remain unresolved. [intake Q6–Q9] | The relevant acceptance evidence cannot be assessed objectively. | Approve measurable criteria and required test access before testing those items. |
| Required contents of check and decision records are unresolved. [intake Q10] | Business users may not be able to determine whether record evidence is complete. | Approve the required record contents and business-observable evidence method before UAT. |
| The migration cutoff depends on the go-live date, which is not provided. [intake Q4] | The history population may be disputed. | Confirm the go-live date, three-year cutoff and reconciliation method before migration acceptance. |
| UAT environment and data-handling arrangements are not specified. [ASSUMPTION] | Testing may be delayed or expose confidential information. | Confirm the environment, access, approved test data and evidence-handling controls before entry. |
| Business objective measures are not specified. [BRD BO-01–BO-03] | UAT cannot establish measured improvement against those objectives. | Record that UAT accepts requirement behavior; agree objective measures separately if they are needed for acceptance. |
