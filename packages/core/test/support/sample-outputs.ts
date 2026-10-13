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

  prd: `# Product Requirements Document: Commercial Loan Policy Check

## Product summary
Commercial Loan Policy Check runs the lending policy rules automatically when a relationship manager (RM) submits a commercial loan application. Failed rules go to the right approver for an exception decision, and every check is recorded. [intake summary]

## Problem
RMs fill in an Excel checklist for every commercial loan and credit staff check it again by hand. It is slow, results vary between people, and it is hard to show regulators how a decision was reached. [requirement-notes.md §1]

## Users
| User | Need |
| --- | --- |
| Relationship manager | Know at once whether a loan meets policy [kickoff-call-transcript.txt 18:05] |
| Credit officer | Decide exceptions up to $5M with the reasons in front of them [requirement-notes.md §3; intake Q1] |
| Senior credit officer | Decide exceptions above $5M [requirement-notes.md §3; intake Q1] |
| Auditor | See how each loan was assessed [requirement-notes.md §4] |

## Features
| ID | Feature | Source | Priority |
| --- | --- | --- | --- |
| F-01 | Automatic policy check on submit: DSCR, LTV, exposure and risk rating | requirement-notes.md §2 | Must |
| F-02 | Results screen showing Pass or Fail and the reason for each rule | figma/policy-check-results.md | Must |
| F-03 | Exception request sent to the right approver by loan amount | requirement-notes.md §3; intake Q1 | Must |
| F-04 | Audit trail of every check and decision | requirement-notes.md §4; intake Q2 | Must |
| F-05 | Three years of history brought over from the legacy checklist | kickoff-call-transcript.txt 12:40 | Should |

## Success measures
- Time from submission to policy result.
- Share of applications with a complete policy check before credit review.
- Audit findings on policy checks.

## Out of scope
- Changing the policy rules themselves; they come from the policy notes. [requirement-notes.md §2]

## Assumptions
- ASSUMPTION: the loan origination system can call the policy check when an application is submitted.
`,

  brd: `# Business Requirements Document: Commercial Loan Policy Check

## Business objectives
| ID | Objective | How it is measured |
| --- | --- | --- |
| BO-01 | Cut the time to a policy result on commercial loans | Time from submission to result |
| BO-02 | Apply the lending policy the same way every time | Share of applications checked automatically |
| BO-03 | Show regulators how each loan was assessed | Audit findings on policy checks |

## Scope
**In scope**
- Policy checks on submission, exceptions, audit trail and legacy history.

**Out of scope**
- Changing the policy rules themselves.

## Stakeholders
| Stakeholder | Interest | Role in the project |
| --- | --- | --- |
| Relationship managers | Fast, clear results | Users |
| Credit officers and senior credit officers | Exceptions with reasons | Approvers |
| Credit Policy | Rules applied correctly | Owns the policy rules |
| Audit | A full record | Reviews records |

## Functional requirements
| ID | Requirement | Source | Priority |
| --- | --- | --- | --- |
| FR-01 | Check that DSCR is at least 1.25x when an application is submitted. | requirement-notes.md §2 | Must |
| FR-02 | Check that LTV is at most 75% when real estate is the collateral. | requirement-notes.md §2 | Must |
| FR-03 | Check that total exposure to the borrower, including existing loans, is at most $10M. | requirement-notes.md §2 | Must |
| FR-04 | Decline the application automatically when the risk rating is 7 or worse. | requirement-notes.md §2 | Must |
| FR-05 | Send any failed rule for an exception decision: a credit officer up to $5M, a senior credit officer above $5M. | requirement-notes.md §3; intake Q1 | Must |
| FR-06 | Email the relationship manager when an exception is decided. | ASSUMPTION | Should |
| FR-07 | Keep an audit record of every check result, decision and approver for the period set in intake Q2. | requirement-notes.md §4; intake Q2 | Must |
| FR-08 | Load three years of results from the legacy checklist as borrower history, and report rows that cannot be loaded. | kickoff-call-transcript.txt 12:40; legacy-policy-checklist.csv | Should |

## Non-functional requirements
| ID | Requirement | Source |
| --- | --- | --- |
| NFR-01 | Show check results within a few seconds of submission. | kickoff-call-transcript.txt 18:05 |
| NFR-02 | Only relationship managers and credit staff can see check results (role-based access). | requirement-notes.md §4 |
| NFR-03 | Borrowers' financial details are treated as personal data and are visible only to those roles. | requirement-notes.md §4 |
| NFR-04 | Check results and decisions are kept for the retention period set in intake Q2. | intake Q2 |
| NFR-05 | New screens meet the accessibility standard set in intake Q3. | intake Q3 |

## Assumptions and constraints
- The legacy checklist has one row per loan; a row with no loan ID cannot be linked to a borrower. [legacy-policy-checklist.csv row 5]
- ASSUMPTION: the loan origination system can call the policy check on submission.
`,

  'test-scenarios': `# Test scenarios: Commercial Loan Policy Check

## Scenarios
| ID | Scenario | Covers | Figma screen |
| --- | --- | --- | --- |
| TS-01 | An application that meets all four rules passes. | FR-01, FR-02, FR-03, FR-04 | Policy check results |
| TS-02 | An application that fails one rule goes for an exception decision. | FR-01, FR-02, FR-05 | Exception request |
| TS-03 | An exception above $5M goes to a senior credit officer. | FR-05 | Exception request |
| TS-04 | A risk rating of 7 is declined with no exception option. | FR-04 | Policy check results |
| TS-05 | Exposure counts the borrower's existing loans. | FR-03 | Application summary |
| TS-06 | The relationship manager is emailed when an exception is decided. | FR-06 | — |
| TS-07 | Every check and decision is recorded. | FR-07 | — |
| TS-08 | Legacy checklist history loads and matches the source file. | FR-08 | — |

## Not covered
None. Every functional requirement has at least one scenario.
`,

  'test-cases': `# Test cases: Commercial Loan Policy Check

## Summary
13 test cases: 5 positive, 5 negative, 3 edge.

## Test cases
| ID | Type | Scenario | Steps | Test data | Expected result | Covers |
| --- | --- | --- | --- | --- | --- | --- |
| TC-01 | Positive | TS-01 | 1. Open the application; 2. Submit for policy check | DSCR 1.40, LTV 60%, exposure $4M, rating 4 | All four rules show Pass | TS-01, FR-01, FR-02, FR-03, FR-04 |
| TC-02 | Edge | TS-01 | 1. Submit for policy check | DSCR exactly 1.25 | DSCR shows Pass | TS-01, FR-01 |
| TC-03 | Negative | TS-02 | 1. Submit for policy check; 2. Open the exception request | DSCR 1.10, amount $2M | DSCR fails with its reason; the exception goes to a credit officer | TS-02, FR-01, FR-05 |
| TC-04 | Edge | TS-01 | 1. Submit for policy check | LTV exactly 75%, real estate collateral | LTV shows Pass | TS-01, FR-02 |
| TC-05 | Negative | TS-02 | 1. Submit for policy check | LTV 80%, real estate collateral | LTV fails: "80% is above the 75% limit" | TS-02, FR-02 |
| TC-06 | Negative | TS-05 | 1. Submit for policy check | New loan $3M; existing loans $8M | Exposure fails at $11M | TS-05, FR-03 |
| TC-07 | Negative | TS-04 | 1. Submit for policy check | Risk rating 7 | Declined; no "Request exception" button | TS-04, FR-04 |
| TC-08 | Edge | TS-03 | 1. Fail one rule; 2. Request an exception | Amount $5,000,001 | Goes to a senior credit officer | TS-03, FR-05 |
| TC-09 | Positive | TS-06 | 1. Approve an exception as credit officer | Any exception | The RM receives an email | TS-06, FR-06 |
| TC-10 | Positive | TS-07 | 1. Run a check; 2. Approve the exception | Any application | Result, decision, approver and time are stored | TS-07, FR-07 |
| TC-11 | Positive | TS-08 | 1. Load the legacy file | legacy-policy-checklist.csv | Row count matches the source file, less rejected rows | TS-08, FR-08 |
| TC-12 | Negative | TS-08 | 1. Load the legacy file | Row with no loan ID | The row is rejected and listed in the load report | TS-08, FR-08 |
| TC-13 | Positive | TS-03 | 1. Fail one rule; 2. Request an exception | Amount $5,000,000 | Goes to a credit officer | TS-03, FR-05 |
`,

  stories: `# Epics and user stories: Commercial Loan Policy Check

## Summary
3 epics, 5 stories, 23 story points.

## EP-01 Automated policy check
Check every application against the lending policy when it is submitted.

### US-01 Check policy rules on submit
As a relationship manager, I want the policy rules checked when I submit an application, so that I know at once whether the loan meets policy.
Covers: FR-01, FR-02, FR-03, FR-04
Figma: Policy check results
Points: 8

**Acceptance criteria**
- Given DSCR 1.40, LTV 60%, exposure $4M and rating 4, when I submit, then all four rules show Pass.
- Given DSCR 1.10, when I submit, then DSCR shows Fail with the reason.
- Given a risk rating of 7, when I submit, then the application is declined.

**Sub-tasks**
- Build the four rule checks
- Build the results screen from the Figma frame
- Add tests for the edge values 1.25x and 75%

## EP-02 Exceptions
Send failed applications to the right approver.

### US-02 Send exceptions to the right approver
As a credit officer, I want failed applications sent to me with the reasons, so that I can approve or decline the exception.
Covers: FR-05
Figma: Exception request
Points: 5

**Acceptance criteria**
- Given a failed rule on a $2M loan, when it is submitted, then it appears in the credit officer queue.
- Given a failed rule on a $6M loan, when it is submitted, then it goes to a senior credit officer.

**Sub-tasks**
- Route by loan amount
- Build the exception request screen
- Build the approver queue

### US-03 Email the RM on an exception decision
As a relationship manager, I want an email when my exception is decided, so that I can tell the borrower quickly.
Covers: FR-06
Figma: —
Points: 2

**Acceptance criteria**
- Given an exception is approved or declined, when the decision is saved, then the RM receives an email.

**Sub-tasks**
- Write the email template
- Send the email on decision

## EP-03 Audit and history
Keep a full record and bring over the legacy history.

### US-04 Record checks and decisions
As an auditor, I want every check and decision recorded, so that I can show regulators how each loan was assessed.
Covers: FR-07
Figma: —
Points: 3

**Acceptance criteria**
- Given a check runs, when it finishes, then the result, user and time are stored.

**Sub-tasks**
- Create the audit record
- Apply the retention period

### US-05 Load legacy checklist history
As a credit officer, I want past checklist results loaded from the legacy file, so that I can see a borrower's history in one place.
Covers: FR-08
Figma: —
Points: 5

**Acceptance criteria**
- Given the legacy file, when it loads, then row counts match the source.
- Given a row with no loan ID, when it loads, then it is rejected and listed in the load report.

**Sub-tasks**
- Map the legacy columns
- Load and reconcile
- Produce the load report
`,
};
