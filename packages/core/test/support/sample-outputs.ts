import type { StageKey } from '../../src/stages/registry';

/**
 * Sample outputs for projects/sample-commercial-loan, used by the tests in place of Copilot.
 * They follow the standard templates. FR-06 deliberately has no source so the
 * BRD guardrail has something to catch.
 */
export const FAKE_FIXTURES: Record<StageKey, string> = {
  intake: `# Intake summary: Commercial Loan Policy Check

## Summary
The project replaces the manual Excel policy checklist with an automatic policy check inside loan origination. Relationship managers (RMs) submit a commercial loan application and the system checks four lending policy rules, sends failures for an exception decision and keeps an audit trail. Project type: migration. Three years of history from the legacy checklist must be brought over.

## Sources read
| Source | Type | Used for |
| --- | --- | --- |
| requirement-notes.md | Requirement notes | Policy rules, exceptions, records and access |
| kickoff-call-transcript.txt | Meeting transcript | Migration scope, speed, approval threshold |
| legacy-policy-checklist.csv | Legacy data | Current process and history to bring over |
| figma/application-summary.md | Figma frame | Application summary screen |
| figma/policy-check-results.md | Figma frame | Results screen |
| figma/exception-request.md | Figma frame | Exception request screen |

## Key facts
- DSCR must be at least 1.25x. [requirement-notes.md §2]
- LTV must be at most 75% when real estate is the collateral. [requirement-notes.md §2]
- Total exposure to one borrower must be at most $10M, counting existing loans. [requirement-notes.md §2]
- A risk rating of 7 or worse is declined; 1 to 6 is eligible. [requirement-notes.md §2]
- Any failed rule needs an exception decision; a credit officer decides. [requirement-notes.md §3]
- Every check and decision must be kept for regulators. [requirement-notes.md §4]
- Only RMs and credit staff may see results, because they include borrowers' financial details. [requirement-notes.md §4]
- Three years of legacy checklist history should be loaded. [kickoff-call-transcript.txt 12:40]
- RMs expect results within a few seconds. [kickoff-call-transcript.txt 18:05]
- One legacy row has no loan ID. [legacy-policy-checklist.csv row 5]

## Open questions
| ID | Question | Found in | Severity | Suggested answer | Answer |
| --- | --- | --- | --- | --- | --- |
| Q1 | The notes say a senior credit officer decides exceptions above $5M; the call says above $7.5M. Which is right? | requirement-notes.md §3; kickoff-call-transcript.txt 21:10 | Critical | $5M, as written in the policy notes | |
| Q2 | How long must check results and decisions be kept? | requirement-notes.md §4 | Critical | Not stated in the inputs; ask Credit Policy | |
| Q3 | Which accessibility standard must the new screens meet? | Figma frames | Normal | Not stated in the inputs | |
`,

  brd: `# Business Requirement Document: Commercial Loan Policy Check

## Stakeholders
| Stakeholder | Role in the project | Interest |
| --- | --- | --- |
| Credit lead | BRD owner | The policy rules applied correctly |
| Relationship managers | Users | Fast, clear results |
| Credit officers and senior credit officers | Approvers | Exceptions with reasons |
| Loan origination IT lead | IT lead | System changes for the check |
| Audit | Reviewer | A full record |

## Requirement sessions
| Session | Date | Attendees | Topics | Source |
| --- | --- | --- | --- | --- |
| Kickoff call | Not stated | Credit lead, RM lead, project manager | Legacy history, speed, approval threshold, screens | kickoff-call-transcript.txt |
| Requirement notes | Not stated | Credit Policy | Policy rules, exceptions, records and access | requirement-notes.md |

## Business objectives
| ID | Objective | How it is measured |
| --- | --- | --- |
| BO-01 | Cut the time to a policy result on commercial loans | Time from submission to result |
| BO-02 | Apply the lending policy the same way every time | Share of applications checked automatically |
| BO-03 | Show regulators how each loan was assessed | Audit findings on policy checks |

## High-level scope
- Policy checks on submission, exception routing, an audit trail and three years of legacy history.

## Current state
RMs fill in an Excel checklist for every application and credit staff check it again by hand. Results vary between people and are hard to show to regulators.

## Future state
The policy check runs automatically when an RM submits an application, failed rules go for an exception decision, and every check and decision is recorded.

## Data flows
| Flow | State | From | To | Data | Frequency |
| --- | --- | --- | --- | --- | --- |
| Checklist | Current | RM | Credit staff | Excel checklist | Per application |
| Policy check | Future | Loan origination | Policy check | Application data | Per application |
| Legacy history | Future | Legacy checklist | Borrower history | Three years of results | One-off load |

## Detailed requirements
| BRD ID | Requirement | Type | Source | Priority |
| --- | --- | --- | --- | --- |
| FR-01 | Check that DSCR is at least 1.25x when an application is submitted. | Functional | requirement-notes.md §2 | Must |
| FR-02 | Check that LTV is at most 75% when real estate is the collateral. | Functional | requirement-notes.md §2 | Must |
| FR-03 | Check that total exposure to the borrower, including existing loans, is at most $10M. | Functional | requirement-notes.md §2 | Must |
| FR-04 | Decline the application automatically when the risk rating is 7 or worse. | Validation | requirement-notes.md §2 | Must |
| FR-05 | Send any failed rule for an exception decision: a credit officer up to $5M, a senior credit officer above $5M. | Functional | requirement-notes.md §3; intake Q1 | Must |
| FR-06 | Email the relationship manager when an exception is decided. | Interface | ASSUMPTION | Should |
| FR-07 | Keep an audit record of every check result, decision and approver for the period set in intake Q2. | Data | requirement-notes.md §4; intake Q2 | Must |
| FR-08 | Load three years of results from the legacy checklist as borrower history, and report rows that cannot be loaded. | Data | kickoff-call-transcript.txt 12:40; legacy-policy-checklist.csv | Should |

## Non-functional requirements
| ID | Requirement | Source |
| --- | --- | --- |
| NFR-01 | Show check results within a few seconds of submission. | kickoff-call-transcript.txt 18:05 |
| NFR-02 | Only relationship managers and credit staff can see check results (role-based access). | requirement-notes.md §4 |
| NFR-03 | Borrowers' financial details are treated as personal data and are visible only to those roles. | requirement-notes.md §4 |
| NFR-04 | Check results and decisions are kept for the retention period set in intake Q2. | intake Q2 |
| NFR-05 | New screens meet the accessibility standard set in intake Q3. | intake Q3 |

## Functional changes
| Change | System | BRD IDs |
| --- | --- | --- |
| Add the policy check on submission | Loan origination | FR-01, FR-02, FR-03, FR-04 |
| Add exception routing and notification | Loan origination | FR-05, FR-06 |
| Add audit records and legacy history | Data platform | FR-07, FR-08 |

## Impacted systems
| System | Impact | Type of change | IT lead |
| --- | --- | --- | --- |
| Loan origination | New policy check and exception flow | Enhancement | Loan origination IT lead |
| Data platform | New audit and history tables | New tables | Data platform IT lead |

## System interfaces
| Interface | From | To | Data | Change |
| --- | --- | --- | --- | --- |
| Exposure feed | Exposure system | Loan origination | Borrower's existing exposure | New |

## Report requirements
No report changes in this release.

## In scope and out of scope
| Item | In scope | Reason |
| --- | --- | --- |
| Policy check, exceptions, audit trail and legacy history | In scope | This release |
| Changing the policy rules themselves | Not in scope | Owned by Credit Policy |

## Assumptions and constraints
- The legacy checklist has one row per loan; a row with no loan ID cannot be linked to a borrower. [legacy-policy-checklist.csv row 5]
- ASSUMPTION: the loan origination system can call the policy check on submission.
`,
  fdd: `# Functional Design Document: Commercial Loan Policy Check

## Summary
8 functional design items covering 8 requirements.

## Functional design
| FDD ID | BRD ID | Functional change | Systems | Tables | Number of columns | Screens and interfaces |
| --- | --- | --- | --- | --- | --- | --- |
| FD-01 | FR-01 | Add the DSCR rule to the policy check | Loan origination | POLICY_CHECK | 3 | Policy check results |
| FD-02 | FR-02 | Add the LTV rule for real estate collateral | Loan origination | POLICY_CHECK | 3 | Policy check results |
| FD-03 | FR-03 | Add the total exposure rule using the exposure feed | Loan origination | POLICY_CHECK | 3 | Exposure feed |
| FD-04 | FR-04 | Decline applications rated 7 or worse | Loan origination | APPLICATION | 1 | Policy check results |
| FD-05 | FR-05 | Route failed rules to the right approver | Loan origination | EXCEPTION_REQUEST | 4 | Exception request |
| FD-06 | FR-06 | Email the RM when an exception is decided | Loan origination | EXCEPTION_REQUEST | 1 | Email |
| FD-07 | FR-07 | Record every check and decision | Data platform | AUDIT_POLICY_CHECK | 6 | None |
| FD-08 | FR-08 | Load legacy checklist history | Data platform | BORROWER_HISTORY | 8 | Load report |

## Impacted systems and tables
| System | Table | Change | Number of columns | FDD IDs |
| --- | --- | --- | --- | --- |
| Loan origination | POLICY_CHECK | New | 9 | FD-01, FD-02, FD-03 |
| Data platform | AUDIT_POLICY_CHECK | New | 6 | FD-07 |
| Data platform | BORROWER_HISTORY | New | 8 | FD-08 |

## Screens and user interactions
- **Policy check results:** one row per rule with Pass or Fail, the actual value and the limit.
- **Exception request:** the failed rule, a reason field and a Send button.

## Assumptions and open points
- ASSUMPTION: the exposure feed returns the borrower's total existing exposure in USD.
`,
  dsd: `# Data Sourcing Document: Commercial Loan Policy Check

## Summary
4 impacted data attributes; 2 need transformation logic; no manual workarounds.

## Data requirements (DRD)
| DRD ID | Data attribute | Business definition | Data type | Target table | BRD ID | FDD ID |
| --- | --- | --- | --- | --- | --- | --- |
| DA-01 | dscr | Debt service coverage ratio of the application | DECIMAL(5,2) | POLICY_CHECK | FR-01 | FD-01 |
| DA-02 | existing_exposure_usd | Borrower's existing exposure in USD | DECIMAL(15,2) | POLICY_CHECK | FR-03 | FD-03 |
| DA-03 | check_result | Pass or Fail per rule, with approver and time | VARCHAR(20) | AUDIT_POLICY_CHECK | FR-07 | FD-07 |
| DA-04 | legacy_result | Result of a legacy checklist row | VARCHAR(20) | BORROWER_HISTORY | FR-08 | FD-08 |

## Data sourcing
| Mapping ID | Data attribute | Source system | Source table and column | Destination table and column | Transformation logic | IT lead |
| --- | --- | --- | --- | --- | --- | --- |
| DS-01 | DA-01 | Loan origination | APPLICATION.DSCR | POLICY_CHECK.DSCR | Direct copy | Loan origination IT lead |
| DS-02 | DA-02 | Exposure system | EXPOSURE.TOTAL_USD | POLICY_CHECK.EXISTING_EXPOSURE_USD | Sum of open loans for the borrower | Loan origination IT lead |
| DS-03 | DA-03 | Policy check | POLICY_CHECK.RESULT | AUDIT_POLICY_CHECK.CHECK_RESULT | Direct copy | Data platform IT lead |
| DS-04 | DA-04 | Legacy checklist | legacy-policy-checklist.csv result | BORROWER_HISTORY.LEGACY_RESULT | Skip rows with no loan_id and list them in the load report | Data platform IT lead |

## Manual workarounds
No manual workarounds: every attribute comes from a system.

## Assumptions and open points
- ASSUMPTION: EXPOSURE.TOTAL_USD already includes every open loan.
`,
  tdd: `# Technical Design Document: Commercial Loan Policy Check

## Summary
8 technical design items covering 8 functional design items.

## Solution overview
A policy check service in loan origination runs the rules on submission and writes results; a nightly job copies results to the data platform, and a one-off job loads legacy history.

## Technical design items
| TDD ID | Component | Design | Data | Covers |
| --- | --- | --- | --- | --- |
| TD-01 | Policy check service | DSCR rule | POLICY_CHECK | FD-01, DA-01 |
| TD-02 | Policy check service | LTV rule for real estate | POLICY_CHECK | FD-02 |
| TD-03 | Policy check service | Exposure rule calling the exposure feed | POLICY_CHECK | FD-03, DA-02 |
| TD-04 | Policy check service | Decline rule for ratings 7 or worse | APPLICATION | FD-04 |
| TD-05 | Exception workflow | Route by amount to the approver queue | EXCEPTION_REQUEST | FD-05 |
| TD-06 | Notification | Send the decision email to the RM | EXCEPTION_REQUEST | FD-06 |
| TD-07 | Audit load job | Nightly copy of results to the data platform | AUDIT_POLICY_CHECK | FD-07, DA-03 |
| TD-08 | Legacy load job | One-off load of the legacy checklist | BORROWER_HISTORY | FD-08, DA-04 |

## ETL design
| Job | Source | Target | Transformation | Schedule | Depends on |
| --- | --- | --- | --- | --- | --- |
| AUDIT_LOAD | POLICY_CHECK | AUDIT_POLICY_CHECK | DS-03 | Nightly 01:00 | Policy check service |
| LEGACY_LOAD | legacy-policy-checklist.csv | BORROWER_HISTORY | DS-04 | Once, before go-live | None |

## Data model changes
| Table | Change | Columns |
| --- | --- | --- |
| POLICY_CHECK | New | 9 |
| AUDIT_POLICY_CHECK | New | 6 |
| BORROWER_HISTORY | New | 8 |

## Error handling and recovery
Each job restarts from the last committed batch and alerts the data platform support team on failure.

## Non-functional design
Results within a few seconds (NFR-01); role-based access (NFR-02, NFR-03); records kept for the retention period (NFR-04).

## Deployment considerations
Deploy the data platform tables first, then the policy check service, then run the legacy load.

## Assumptions and open points
- ASSUMPTION: the exposure feed answers within one second.
`,
  'sit-strategy': `# SIT QA Strategy: Commercial Loan Policy Check

## Purpose and objectives
Prove that the policy check, exception routing, audit records and legacy history load work across the integrated systems.

## Scope
- The policy check, exceptions, audit load and legacy load; not the policy rules themselves.

## Requirements in scope
| BRD ID | Requirement | In SIT scope | Reason |
| --- | --- | --- | --- |
| FR-01 | DSCR rule | Yes | |
| FR-02 | LTV rule | Yes | |
| FR-03 | Exposure rule | Yes | |
| FR-04 | Decline on risk rating | Yes | |
| FR-05 | Exception routing | Yes | |
| FR-06 | RM email | Yes | |
| FR-07 | Audit record | Yes | |
| FR-08 | Legacy history | Yes | |

## Test approach
Functional and integration testing of the policy check and exception flow, and data load and reconciliation testing of AUDIT_LOAD and LEGACY_LOAD.

## Test environments
| Environment | Purpose | Systems and versions | Test data |
| --- | --- | --- | --- |
| SIT | Integrated testing | Loan origination, data platform, exposure feed stub, email | Masked sample applications |

## Test data
Masked applications covering each rule's limit, and a copy of the legacy checklist with one row missing its loan ID.

## Entry criteria
- The TDD is approved and the build has passed development unit testing.
- The SIT environment and the exposure feed stub are available.

## Exit criteria
- Every SIT case for a Must requirement has been run, and at least 95% have passed.
- No open severity 1 or 2 defects.

## Defect management
Severity 1 to 4; the QA lead triages daily; fixes are retested in SIT.

## Roles and responsibilities
| Role | Responsibility |
| --- | --- |
| QA lead | Plans SIT and reports progress |
| Testers | Run SIT |

## Schedule and dependencies
Two weeks after the build is handed over; depends on the exposure feed stub.

## Risks and mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Exposure feed stub late | SIT starts late | Agree the stub's date with the integration team |
`,
  'uat-strategy': `# UAT QA Strategy: Commercial Loan Policy Check

## Purpose and objectives
Let relationship managers and credit officers confirm the policy check supports how they assess commercial loans.

## Scope
- The business processes for submitting, deciding exceptions and reviewing records.

## Requirements in scope
| BRD ID | Requirement | In UAT scope | Reason |
| --- | --- | --- | --- |
| FR-01 | DSCR rule | Yes | |
| FR-02 | LTV rule | Yes | |
| FR-03 | Exposure rule | Yes | |
| FR-04 | Decline on risk rating | Yes | |
| FR-05 | Exception routing | Yes | |
| FR-06 | RM email | Yes | |
| FR-07 | Audit record | Yes | |
| FR-08 | Legacy history | No | Data load reconciled in SIT; no business action |

## Business processes to accept
| Process | Requirements | Business owner |
| --- | --- | --- |
| Submit an application and read the policy result | FR-01, FR-02, FR-03, FR-04 | Head of Commercial Lending |
| Request and decide an exception | FR-05, FR-06 | Head of Credit |
| Review the audit record | FR-07 | Credit Policy |

## Participants and roles
| Role | Who | Responsibility |
| --- | --- | --- |
| UAT lead | UAT lead | Runs UAT and reports progress |
| Business testers | Relationship managers and credit officers | Test the business processes |

## Approach
End-to-end business flows for each process, using masked applications that business users recognise.

## UAT environment and data
The UAT environment with masked copies of recent applications.

## Entry criteria
- The SIT exit criteria are met.
- The UAT environment and data are ready.

## Exit and sign-off criteria
- Every business process has been tested and passed, or has an agreed workaround.
- Each business owner signs off their process.

## Defect management
Business testers raise defects with the UAT lead, who agrees severity with the business owner.

## Schedule
One week after SIT exit.

## Risks and mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Business testers unavailable | UAT slips | Book testers before SIT exit |
`,
};
