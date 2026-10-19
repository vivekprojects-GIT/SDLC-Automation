# Requirements Traceability Matrix: Commercial Loan Policy Check

Generated 2026-10-19T17:19:13.524Z. Every requirement in the BRD, traced to the functional design, the data attributes, the technical design and the SIT and UAT scope. The Transition to BAU plan columns are in rtm.xlsx, for the BAU owner to complete.

| BRD ID | Requirement | Type | Source | FDD | Data attributes | TDD | In SIT scope | In UAT scope | Trace |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-01 | The system must start a policy check when an RM submits an application for policy checking. | Functional | requirement-notes.md §2; figma/application-summary.md | FD-01 | — | TD-01 | Yes | Yes | Complete |
| FR-02 | The system must pass the DSCR rule when DSCR is at least 1.25x. | Validation | requirement-notes.md §2 | FD-02 | DA-05, DA-13, DA-25 | TD-02 | Yes | Yes | Complete |
| FR-03 | When real estate is the collateral, the system must pass the LTV rule when LTV is at most 75%. | Validation | requirement-notes.md §2 | FD-03 | DA-04, DA-06, DA-14, DA-26 | TD-03 | Yes | Yes | Complete |
| FR-04 | The system must pass the exposure rule when total exposure to one borrower, including the borrower’s existing loans, is at most $10M. | Validation | requirement-notes.md §2 | FD-04 | DA-07, DA-12, DA-15, DA-27 | TD-04 | Yes | Yes | Complete |
| FR-05 | The system must treat a risk rating from 1 to 6 as eligible. | Validation | requirement-notes.md §2 | FD-05 | DA-08, DA-16, DA-28 | TD-05 | Yes | Yes | Complete |
| FR-06 | The system must decline a loan with a risk rating of 7 or worse, without an exception path. | Validation | requirement-notes.md §2; intake Q2 | FD-06 | DA-08, DA-16, DA-28 | TD-06 | Yes | Yes | Complete |
| FR-07 | The system must require an exception decision before a loan can proceed when a rule fails and the loan is not declined. | Functional | requirement-notes.md §3; intake Q2 | FD-07 | DA-31 | TD-07 | Yes | Yes | Complete |
| FR-08 | The system must assign an exception decision to a senior credit officer when the loan amount is above $5M. | Functional | requirement-notes.md §3; intake Q1 | FD-08 | DA-03, DA-30 | TD-08 | Yes | Yes | Complete |
| FR-09 | The system must assign an exception decision to a credit officer when the loan amount is $5M or less. | Functional | requirement-notes.md §3; intake Q1 | FD-09 | DA-03, DA-30 | TD-09 | Yes | Yes | Complete |
| FR-10 | The application summary must show borrower name, loan ID, amount, collateral type, DSCR, LTV, existing exposure to the borrower and risk rating. | Data | figma/application-summary.md | FD-10 | DA-01, DA-02, DA-03, DA-04, DA-05, DA-06, DA-07, DA-08 | TD-10 | Yes | Yes | Complete |
| FR-11 | The application summary must provide a “Submit for policy check” action. | Functional | figma/application-summary.md | FD-11 | — | TD-11 | Yes | Yes | Complete |
| FR-12 | The policy results must show a row for each of the DSCR, LTV, exposure and risk rating rules, with a Pass or Fail outcome. | Functional | figma/policy-check-results.md | FD-12 | DA-13, DA-14, DA-15, DA-16 | TD-12 | Yes | Yes | Complete |
| FR-13 | For each failed rule, the policy results must show the reason, actual value and limit. | Data | figma/policy-check-results.md | FD-13 | DA-17, DA-18, DA-19, DA-20, DA-21, DA-22, DA-23, DA-24, DA-25, DA-26, DA-27, DA-28 | TD-13 | Yes | Yes | Complete |
| FR-14 | The policy results must show “Request exception” only when a rule fails and the loan is not declined. | Functional | figma/policy-check-results.md; intake Q2 | FD-14 | — | TD-14 | Yes | Yes | Complete |
| FR-15 | The exception request must show the failed rules and their reasons. | Data | figma/exception-request.md | FD-15 | DA-17, DA-18, DA-19, DA-20 | TD-15 | Yes | Yes | Complete |
| FR-16 | The exception request must provide an RM justification text box. | Functional | figma/exception-request.md | FD-16 | DA-29 | TD-16 | Yes | Yes | Complete |
| FR-17 | The exception request must identify the deciding role as credit officer or senior credit officer. | Data | figma/exception-request.md; requirement-notes.md §3; intake Q1 | FD-17 | DA-30 | TD-17 | Yes | Yes | Complete |
| FR-18 | The exception request must provide “Approve exception” and “Decline” actions. | Functional | figma/exception-request.md | FD-18 | DA-31 | TD-18 | Yes | Yes | Complete |
| FR-19 | The system must keep a full record of every policy check and every decision. | Data | requirement-notes.md §4 | FD-19 | DA-13, DA-14, DA-15, DA-16, DA-29, DA-30, DA-31 | TD-19 | Yes | Yes | Complete |
| FR-20 | The system must make policy-check results available only to RMs and credit staff. | Functional | requirement-notes.md §4 | FD-20 | — | TD-20 | Yes | Yes | Complete |
| FR-21 | The system must migrate every legacy checklist row submitted in the three years before go-live, from the legacy checklist file. | Data | intake Q4 | FD-21 | DA-09, DA-10, DA-11 | TD-21 | Yes | Yes | Complete |
| FR-22 | The system must migrate the legacy checklist fields loan ID, borrower, submitted date, amount, DSCR, LTV, existing exposure, risk rating, result and checker. | Data | legacy-policy-checklist.csv row 1; intake Q4 | FD-22 | DA-01, DA-02, DA-03, DA-05, DA-06, DA-07, DA-08, DA-09, DA-10, DA-11 | TD-22 | Yes | Yes | Complete |
| FR-23 | The system must make migrated checklist history available to show a borrower’s history. | Functional | kickoff-call-transcript.txt 12:40; intake Q4 | FD-23 | — | TD-23 | Yes | Yes | Complete |
| FR-24 | The system must migrate a legacy checklist row that has no loan ID. | Data | legacy-policy-checklist.csv row 6 | FD-24 | DA-02 | TD-24 | Yes | Yes | Complete |
