# SDLC Automation Tool

Turns requirement notes and Figma frames into an approved PRD, BRD, test scenarios, test cases and Jira stories, using GitHub Copilot, with a human review at every step.

Open the `sdlc-automation` repo folder in VS Code, then click **SDLC Tool** in the status bar or run **SDLC: Open SDLC Automation Tool** from the Command Palette.

Pick the model in the tool's top bar: **Auto** (the most capable model your Copilot plan lets extensions use, falling back to the next one if a model is refused) or any listed Copilot model. Each request is kept below the chosen model's input limit, and the audit log records which model wrote each document.

Settings:

- `sdlcAutomation.model`: the model id picked in the top bar; empty means Auto.
- `sdlcAutomation.reviewerName`: your name for approvals and the audit log.
- `sdlcAutomation.autoAdvance`: start the next step automatically after an approval.
