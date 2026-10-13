# Questions people ask

**Does the AI decide what goes into the requirements?**
No. It writes drafts. A named person approves every document, and the audit log records who approved what. Anything the AI cannot trace to a source is flagged, and a person keeps or removes it.

**What if Copilot gets something wrong?**
It will sometimes. In testing it invented features, left out requirements and wrote a BRD without the actual policy limits. The checks caught each of these and blocked approval until someone dealt with it. What no check can find is a requirement that is not in the inputs at all, so the reviewer still matters.

**Is client data safe?**
Documents go only to GitHub Copilot, through VS Code, and everything else stays in the project folder on your laptop. The audit log is never sent. Before using a client's real documents, get approval to send them through Copilot.

**Which AI model does it use?**
Whatever your Copilot plan offers. Pick one in the top bar, or leave it on **Auto**. Different people may see different models, depending on their plan and organisation.

**What does it cost?**
Nothing beyond the GitHub Copilot licence you already have. There is no server and no API key.

**How is this different from BMAD?**
BMAD is an open-source toolkit for developers going from an idea to code, where you chat with agents and checking is up to you. This tool is for delivery teams' documents. It produces a BRD, formal test cases, a Jira file and a traceability matrix, and enforces its checks in code.

**Why not LangGraph, or a hosted app?**
Everything runs locally on the Copilot licence teams already have, with nothing to host or approve. The engine does not depend on Copilot, so a hosted version or a different AI can be added later without rewriting the workflow.

**Can it follow our templates?**
Yes. Add them under `content/templates/<org>/` and point the project at them. See [customising.md](customising.md).

**Does it work for migrations and fixes, not only new builds?**
Set the project type in `project.yaml`, and the agents are told which kind of project it is. Special handling for each type, such as documenting only changes for a fix, is not built yet.

**Can two people work on the same project?**
Not at the same time in the same folder. One person drives a project; others review the documents it produces.

**How do I load the stories into Jira?**
Jira → System → External system import → CSV, with `outputs/jira-import.csv`. Map **Issue Id** and **Parent Id** so stories sit under their epics and sub-tasks under their stories. Your Jira may need the Acceptance Criteria column mapped to a custom field.

**Can it write Word documents?**
Not yet. The documents are Markdown files with a version header. Word in your organisation's style is planned.

**Where do I start?**
[getting-started.md](getting-started.md), then [how-it-works.md](how-it-works.md).
