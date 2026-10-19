# SDLC CAPM

Writes MUFG's PDLC Planning deliverables (BRD, FDD, DRD/DSD, TDD, and the SIT and UAT QA Strategies) and the RTM with its Transition to BAU plan, using GitHub Copilot, with a named owner approving each one. The approved deliverables are exported as Word and Excel files for Planview or PPP, with a Jira import of epics, stories and sub-tasks for the delivery team.

![The SDLC CAPM screen with a deliverable waiting for its owner's review](https://raw.githubusercontent.com/vivekprojects-GIT/SDLC-Automation/main/docs/images/screen-review.jpg)

Open the `SDLC_CAPM` folder in VS Code, then click **SDLC CAPM** in the status bar or run **SDLC CAPM: Open SDLC CAPM** from the Command Palette.

Pick the model in the tool's top bar: **Auto** (the most capable model your Copilot plan lets extensions use, falling back to the next one if a model is refused) or any listed Copilot model. Each request is kept below the chosen model's input limit, and the audit log records which model wrote each deliverable.

Settings:

- `sdlcCapm.model`: the model id picked in the top bar; empty means Auto.
- `sdlcCapm.reviewerName`: your name for approvals and the audit log.
- `sdlcCapm.autoAdvance`: start the next step automatically after an approval.
