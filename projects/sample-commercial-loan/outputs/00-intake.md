---
document: Intake summary
project: Commercial Loan Policy Check
version: "1.0"
status: approved
owner: Project manager
template: standard/intake.md
generated_by: Business analyst agent via GitHub Copilot (copilot/claude-fable-5.1)
approved_by: vivek (Project manager)
approved_at: 2026-10-19T16:09:19.267Z
---

# Intake summary: Commercial Loan Policy Check

## Summary
The Commercial Loan Policy Check is a migration project to replace the current Excel checklist process for commercial loan applications. It will move policy checking from repeated manual reviews toward a system check when an RM submits an application. RMs and credit staff use the process, and credit officers or senior credit officers decide exceptions. The stated goals include reducing delay and variation and making decisions easier to explain to regulators.

## Sources read
| Source | Type | Used for |
| --- | --- | --- |
| `requirement-notes.md` | Kickoff notes | Current process, policy rules, exception routing, records and access |
| `kickoff-call-transcript.txt` | Call transcript | History migration request, pain point, performance expectation, possible approval threshold, Figma reference |
| `legacy-policy-checklist.csv` | Legacy data | Existing checklist fields, recorded outcomes and checker roles; sample data completeness |
| `figma/application-summary.md` | Figma frame description | Application summary fields and submission action |
| `figma/policy-check-results.md` | Figma frame description | Results layout, displayed rule outcomes and exception action |
| `figma/exception-request.md` | Figma frame description | Exception information, justification field and approval actions |

## Key facts
- RMs currently fill in an Excel checklist for every commercial loan application, and credit staff check the same checklist again by hand. [requirement-notes.md §1]
- The current process is described as slow, results vary between people, and it is hard to show regulators how a decision was reached. [requirement-notes.md §1]
- When an RM submits an application, the system must check DSCR at least 1.25x. [requirement-notes.md §2]
- When real estate is the collateral, LTV must be at most 75%. [requirement-notes.md §2]
- Total exposure to one borrower must be at most $10M, counting the borrower's existing loans. [requirement-notes.md §2]
- Risk rating 1 to 6 is eligible; a risk rating of 7 or worse is declined. [requirement-notes.md §2]
- Any failed rule needs an exception decision before the loan can go ahead. [requirement-notes.md §3]
- A credit officer decides exceptions; above $5M, a senior credit officer decides. [requirement-notes.md §3]
- A full record of every check and every decision must be kept for regulators. [requirement-notes.md §4]
- Only RMs and credit staff may see check results because they include borrowers' financial details. [requirement-notes.md §4]
- The credit lead proposed bringing over three years of the old checklist to show a borrower's history. [kickoff-call-transcript.txt 12:40]
- The RM lead said credit currently re-checks the same rules, which is the worst part of the process. [kickoff-call-transcript.txt 14:15]
- The RM lead said RMs will not wait more than a few seconds for results and that results must feel instant. [kickoff-call-transcript.txt 18:05]
- The credit lead said senior sign-off starts above 7.5 million, but added that this needs checking. [kickoff-call-transcript.txt 21:10]
- The project manager identified the application summary, policy check results and exception request as the Figma screens. [kickoff-call-transcript.txt 24:30]
- The application summary frame shows borrower name, loan ID, amount, collateral type, DSCR, LTV, existing exposure to the borrower and risk rating, with a “Submit for policy check” button. [figma/application-summary.md]
- The policy results frame shows one row per rule for DSCR, LTV, exposure and risk rating; each row shows Pass or Fail, and a failed row shows the reason, actual value and limit. [figma/policy-check-results.md]
- The policy results frame shows “Request exception” only when a rule fails and the loan is not declined. [figma/policy-check-results.md]
- The exception request frame shows failed rules and reasons, provides an RM justification text box, identifies the deciding role as credit officer or senior credit officer, and provides “Approve exception” and “Decline” buttons. [figma/exception-request.md]
- The legacy checklist has fields for loan ID, borrower, submitted date, amount, DSCR, LTV, existing exposure, risk rating, result and checker. [legacy-policy-checklist.csv row 1]
- The legacy sample has five records; its recorded results include Pass, Exception and Declined, and its checker values include credit officer and senior credit officer. [legacy-policy-checklist.csv rows 2–6]
- One legacy record has no loan ID. [legacy-policy-checklist.csv row 6]
- The Figma descriptions identify themselves as samples and say PNG exports of real frames should also be provided. [figma/application-summary.md; figma/policy-check-results.md; figma/exception-request.md]

## Open questions
| ID | Question | Found in | Severity | Suggested answer | Answer |
| --- | --- | --- | --- | --- | --- |
| Q1 | Which amount threshold determines whether a senior credit officer decides an exception: above $5M or above 7.5 million? | requirement-notes.md §3; kickoff-call-transcript.txt 21:10 | Critical |  | Above $5M, as written in the policy notes §3. The 7.5 million on the call was not confirmed. |
| Q2 | When a risk rating is 7 or worse, is the loan always declined without an exception path, or can the failed rule be sent for an exception decision? | requirement-notes.md §2–3; figma/policy-check-results.md | Critical |  | Always declined. A risk rating of 7 or worse has no exception path. |
| Q3 | Should the system check and display LTV only when real estate is the collateral, or should the results frame show LTV for other collateral types too? | requirement-notes.md §2; figma/application-summary.md; figma/policy-check-results.md | Normal |  | |
| Q4 | Is migration of three years of checklist history in scope, and what source records must be included? | kickoff-call-transcript.txt 12:40; legacy-policy-checklist.csv rows 1–6 | Critical | Three years of old checklist history, as proposed by the credit lead | Yes, in scope. Demo assumption: every checklist row submitted in the three years before go-live, from the legacy checklist file. |
| Q5 | What measurable response-time limit should apply to policy-check results? | kickoff-call-transcript.txt 18:05 | Critical | “A few seconds,” as stated by the RM lead; the exact limit is not specified | Demo assumption: results within 3 seconds of submission. |
| Q6 | How must the system enforce the restriction that only RMs and credit staff may see check results, and are any further access rules required? | requirement-notes.md §4 | Normal |  | |
| Q7 | What privacy requirements apply to borrower financial details beyond restricting who may see check results? | requirement-notes.md §4 | Normal |  | |
| Q8 | How long must checks, decisions and migrated checklist records be retained? | requirement-notes.md §4 | Normal |  | |
| Q9 | What accessibility requirements must the screens meet? | Sources read: all provided sources | Normal |  | |
| Q10 | What information must the full record of each check and decision contain? | requirement-notes.md §4 | Normal |  | |
| Q11 | Are the supplied sample Figma descriptions sufficient as screen evidence, or will the real frame PNG exports be provided for review? | figma/application-summary.md; figma/policy-check-results.md; figma/exception-request.md | Normal |  | |
