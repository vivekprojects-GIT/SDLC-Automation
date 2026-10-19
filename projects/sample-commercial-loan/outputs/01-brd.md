---
document: Business Requirement Document
project: Commercial Loan Policy Check
version: "1.0"
status: approved
owner: Business analyst
template: standard/brd.md
generated_by: Business analyst agent via GitHub Copilot (copilot/claude-fable-5.1)
approved_by: vivek (Business analyst)
approved_at: 2026-10-19T16:13:58.463Z
---

# Business Requirement Document: Commercial Loan Policy Check

## Stakeholders
| Stakeholder | Role in the project | Interest |
| --- | --- | --- |
| Business analyst | Owner of this document | Document owner. [Project information] |
| RM lead | Business lead | Described the repeated checks and required response experience. [kickoff-call-transcript.txt 14:15; 18:05] |
| Credit lead | Business stakeholder | Proposed migration of checklist history and described exception approval routing. [kickoff-call-transcript.txt 12:40; 21:10] |
| Project manager | Project stakeholder | Identified the Figma screens. [kickoff-call-transcript.txt 24:30] |
| IT lead(s) | IT lead; not identified in the material | Names and system responsibilities are not provided. [Intake summary] |
| System business owner(s) | Business owner for impacted systems; not identified in the material | Names and system responsibilities are not provided. [Intake summary] |

## Requirement sessions
| Session | Date | Attendees | Topics | Source |
| --- | --- | --- | --- | --- |
| Kickoff call | Not stated | RM lead; credit lead; project manager (roles referenced; full attendee list not provided) | Current process pain points; history migration; response expectation; possible approval threshold; screen references | kickoff-call-transcript.txt 12:40; 14:15; 18:05; 21:10; 24:30 |
| Kickoff notes | Not stated | Not stated | Current process; policy rules; exception routing; records and access | requirement-notes.md §§1–4 |

## Business objectives
| ID | Objective | How it is measured |
| --- | --- | --- |
| BO-01 | Reduce delay in policy checking. [requirement-notes.md §1] | No baseline or target is specified; confirm the measure. |
| BO-02 | Reduce variation in policy-check results. [requirement-notes.md §1] | No baseline or target is specified; confirm the measure. |
| BO-03 | Make decisions easier to explain to regulators. [requirement-notes.md §§1, 4] | No measure is specified; confirm the measure. |

## High-level scope
- Replace the Excel checklist process with a system policy check when an RM submits a commercial loan application. [requirement-notes.md §§1–2]
- Apply the stated DSCR, real-estate LTV, borrower exposure and risk-rating rules. [requirement-notes.md §2]
- Support exception decisions and retain check and decision records. [requirement-notes.md §§3–4]
- Migrate three years of checklist history as specified in intake Q4. [kickoff-call-transcript.txt 12:40; intake Q4]

## Current state
RMs complete an Excel checklist for each commercial loan application, and credit staff manually check the same checklist again. The process is described as slow, variable between people and difficult to explain to regulators. [requirement-notes.md §1; kickoff-call-transcript.txt 14:15]

The legacy checklist contains loan ID, borrower, submitted date, amount, DSCR, LTV, existing exposure, risk rating, result and checker. The sample contains five records, including one without a loan ID. [legacy-policy-checklist.csv rows 1–6]

## Future state
When an RM submits an application, the system checks the policy rules and displays Pass or Fail for each rule. A failed rule displays its reason, actual value and limit. A loan with a risk rating of 7 or worse is declined without an exception path. Other failed rules require an exception decision before the loan can proceed. [requirement-notes.md §§2–3; figma/policy-check-results.md; intake Q2]

The system supports exception requests and decisions by the credit officer or senior credit officer, according to the confirmed amount threshold. It retains a full record of every check and decision. [requirement-notes.md §§3–4; intake Q1]

## Data flows
| Flow | State | From | To | Data | Frequency |
| --- | --- | --- | --- | --- | --- |
| Checklist completion and review | Current | RM using Excel checklist | Credit staff | Application and policy-check fields; result; checker | For every commercial loan application. [requirement-notes.md §1; legacy-policy-checklist.csv row 1] |
| Application submission for policy check | Future | RM/application submission | Policy-check system | Borrower name; loan ID; amount; collateral type; DSCR; LTV; existing exposure; risk rating | On application submission. [figma/application-summary.md; requirement-notes.md §2] |
| Policy-check results | Future | Policy-check system | RM and credit staff | Rule outcomes; failed-rule reason, actual value and limit | After each policy check. [figma/policy-check-results.md; requirement-notes.md §4] |
| Exception request and decision | Future | RM | Credit officer or senior credit officer | Failed rules and reasons; RM justification; decision | When an eligible failed rule requires an exception. [figma/exception-request.md; requirement-notes.md §3; intake Q1–Q2] |
| Checklist history migration | Future | Legacy checklist file | New system | Checklist rows submitted in the three years before go-live | One-time migration; timing is not specified. [intake Q4] |

## Detailed requirements
| BRD ID | Requirement | Type | Source | Priority |
| --- | --- | --- | --- | --- |
| FR-01 | The system must start a policy check when an RM submits an application for policy checking. | Functional | requirement-notes.md §2; figma/application-summary.md | Must |
| FR-02 | The system must pass the DSCR rule when DSCR is at least 1.25x. | Validation | requirement-notes.md §2 | Must |
| FR-03 | When real estate is the collateral, the system must pass the LTV rule when LTV is at most 75%. | Validation | requirement-notes.md §2 | Must |
| FR-04 | The system must pass the exposure rule when total exposure to one borrower, including the borrower’s existing loans, is at most $10M. | Validation | requirement-notes.md §2 | Must |
| FR-05 | The system must treat a risk rating from 1 to 6 as eligible. | Validation | requirement-notes.md §2 | Must |
| FR-06 | The system must decline a loan with a risk rating of 7 or worse, without an exception path. | Validation | requirement-notes.md §2; intake Q2 | Must |
| FR-07 | The system must require an exception decision before a loan can proceed when a rule fails and the loan is not declined. | Functional | requirement-notes.md §3; intake Q2 | Must |
| FR-08 | The system must assign an exception decision to a senior credit officer when the loan amount is above $5M. | Functional | requirement-notes.md §3; intake Q1 | Must |
| FR-09 | The system must assign an exception decision to a credit officer when the loan amount is $5M or less. | Functional | requirement-notes.md §3; intake Q1 | Must |
| FR-10 | The application summary must show borrower name, loan ID, amount, collateral type, DSCR, LTV, existing exposure to the borrower and risk rating. | Data | figma/application-summary.md | Must |
| FR-11 | The application summary must provide a “Submit for policy check” action. | Functional | figma/application-summary.md | Must |
| FR-12 | The policy results must show a row for each of the DSCR, LTV, exposure and risk rating rules, with a Pass or Fail outcome. | Functional | figma/policy-check-results.md | Must |
| FR-13 | For each failed rule, the policy results must show the reason, actual value and limit. | Data | figma/policy-check-results.md | Must |
| FR-14 | The policy results must show “Request exception” only when a rule fails and the loan is not declined. | Functional | figma/policy-check-results.md; intake Q2 | Must |
| FR-15 | The exception request must show the failed rules and their reasons. | Data | figma/exception-request.md | Must |
| FR-16 | The exception request must provide an RM justification text box. | Functional | figma/exception-request.md | Must |
| FR-17 | The exception request must identify the deciding role as credit officer or senior credit officer. | Data | figma/exception-request.md; requirement-notes.md §3; intake Q1 | Must |
| FR-18 | The exception request must provide “Approve exception” and “Decline” actions. | Functional | figma/exception-request.md | Must |
| FR-19 | The system must keep a full record of every policy check and every decision. | Data | requirement-notes.md §4 | Must |
| FR-20 | The system must make policy-check results available only to RMs and credit staff. | Functional | requirement-notes.md §4 | Must |
| FR-21 | The system must migrate every legacy checklist row submitted in the three years before go-live, from the legacy checklist file. | Data | intake Q4 | Must |
| FR-22 | The system must migrate the legacy checklist fields loan ID, borrower, submitted date, amount, DSCR, LTV, existing exposure, risk rating, result and checker. | Data | legacy-policy-checklist.csv row 1; intake Q4 | Must |
| FR-23 | The system must make migrated checklist history available to show a borrower’s history. | Functional | kickoff-call-transcript.txt 12:40; intake Q4 | Must |
| FR-24 | The system must migrate a legacy checklist row that has no loan ID. | Data | legacy-policy-checklist.csv row 6 | Must |

## Non-functional requirements
| ID | Requirement | Source |
| --- | --- | --- |
| NFR-01 | The system must restrict access to policy-check results to RMs and credit staff. Further access controls are not specified and require confirmation. | requirement-notes.md §4; intake Q6 |
| NFR-02 | ASSUMPTION: The system must protect borrower financial details from access beyond the permitted groups; the required privacy controls are to be confirmed. | ASSUMPTION; requirement-notes.md §4; intake Q7 |
| NFR-03 | ASSUMPTION: The system must retain checks, decisions and migrated checklist records for a retention period to be confirmed. | ASSUMPTION; requirement-notes.md §4; intake Q8 |
| NFR-04 | ASSUMPTION: The screens must meet accessibility requirements to be confirmed. | ASSUMPTION; intake Q9 |
| NFR-05 | The system must keep a full record of every check and decision; the record’s required contents are to be confirmed. | requirement-notes.md §4; intake Q10 |
| NFR-06 | ASSUMPTION: The system must return policy-check results within 3 seconds of submission. | ASSUMPTION; intake Q5 |

## Functional changes
| Change | System | BRD IDs |
| --- | --- | --- |
| Replace manual checklist checking with submission-triggered policy checks and display the results. | New policy-check system; system name not provided | FR-01–FR-06; FR-10–FR-14 |
| Support exception requests and decisions, including role assignment. | New policy-check system; system name not provided | FR-07–FR-09; FR-15–FR-18 |
| Retain check and decision records and restrict results access. | New policy-check system; system name not provided | FR-19–FR-20 |
| Migrate checklist history and make it available for borrower history. | New policy-check system; legacy Excel checklist | FR-21–FR-23 |

## Impacted systems
| System | Impact | Type of change | IT lead |
| --- | --- | --- | --- |
| New policy-check system; name not provided | Runs policy checks, supports exceptions, stores records and migrated history | New or changed system; implementation status not specified | Not identified |
| Legacy Excel checklist | Source of checklist history for migration | Data migration source | Not identified |

## System interfaces
| Interface | From | To | Data | Change |
| --- | --- | --- | --- | --- |
| Application submission to policy check | Application submission; system name not provided | New policy-check system; system name not provided | Application summary fields and policy-check inputs | Required for submission-triggered checking; technical interface design is not provided. [requirement-notes.md §2; figma/application-summary.md] |
| Legacy checklist migration | Legacy Excel checklist | New policy-check system; system name not provided | Checklist rows and fields specified in FR-21–FR-22 | Migrate the stated three-year history. [intake Q4; legacy-policy-checklist.csv row 1] |

## Report requirements
No reports are specified in the material. The required record of every check and decision is covered by FR-19 and NFR-05; no report format or frequency is provided. [requirement-notes.md §4]

## In scope and out of scope
| Item | In scope | Reason |
| --- | --- | --- |
| Submission-triggered commercial loan policy checks | In scope | Replaces repeated manual checklist reviews. [requirement-notes.md §§1–2] |
| Exception request and decision process | In scope | Required for failed rules that are not declined. [requirement-notes.md §3; intake Q2] |
| Check and decision records; results access restriction | In scope | Required by the notes. [requirement-notes.md §4] |
| Migration of checklist history | In scope | Confirmed in intake Q4, with the demo assumption defining the records to migrate. |
| Other out-of-scope items | Not specified | The material does not identify any other out-of-scope items. |

## Assumptions and constraints
- The migration includes every checklist row submitted in the three years before go-live, from the legacy checklist file. [intake Q4]
- Policy-check results are expected within 3 seconds of submission for the demo. [intake Q5]
- LTV display for collateral types other than real estate remains unresolved. [intake Q3]
- Further access-control rules remain unresolved. [intake Q6]
- Privacy requirements beyond the results access restriction remain unresolved. [intake Q7]
- Retention periods remain unresolved. [intake Q8]
- Accessibility requirements remain unresolved. [intake Q9]
- Required contents of the full check and decision record remain unresolved. [intake Q10]
- The Figma descriptions are samples and state that PNG exports of real frames should also be provided; whether those exports will be provided remains unresolved. [figma/application-summary.md; figma/policy-check-results.md; figma/exception-request.md; intake Q11]
- Business objective measures, attendee names and session dates are not provided. [requirement-notes.md; kickoff-call-transcript.txt]
