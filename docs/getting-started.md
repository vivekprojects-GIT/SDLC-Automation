# Getting started

From a fresh laptop to your first approved document in about 15 minutes.

## What you need

| Need | Check |
| --- | --- |
| VS Code 1.95 or newer | Help → About |
| GitHub Copilot, signed in | The Accounts icon (bottom left) shows your GitHub account |
| Node.js 20 or newer | `node -v` in a terminal |
| Git | `git --version` |

## Install

```bash
git clone https://github.com/vivekprojects-GIT/SDLC-Automation.git sdlc-automation
cd sdlc-automation
npm install
npm run install-extension
```

`install-extension` builds the tool, packages it as `sdlc-automation.vsix` and installs it into VS Code. Run it again whenever you pull a new version.

## First run

1. In VS Code, **File → Open Folder** and pick the `sdlc-automation` folder.
2. If a yellow **Restricted Mode** bar appears, click **Manage** and choose **Trust**. Copilot is switched off in untrusted folders, so the tool cannot write documents until you do this.
3. Click **SDLC Tool** in the status bar at the bottom. (Or Command Palette → **SDLC: Open SDLC Automation Tool**.)
4. Leave **Model** in the top bar on **Auto**.
5. Click **Run pipeline**. The first time, VS Code asks whether the extension may use Copilot: click **Allow**.
6. After about half a minute the intake summary appears. Answer any critical questions, then click **Approve**. The next step starts by itself.

The sample project in `projects/sample-commercial-loan` uses made-up data, so it is safe to run as often as you like.

## Start your own project

1. Copy `projects/sample-commercial-loan` to `projects/<your-project>`. Delete its `inputs` and `outputs` folders.
2. Edit `project.yaml`: the name, the type (`new-build`, `migration` or `enhancement`), the template pack and who owns each document.
3. Click **Add files** in the tool, or copy files into `inputs/` yourself. Readable: `.md`, `.txt`, `.csv`, `.docx`, `.xlsx`. Figma frames go in `inputs/figma/` as PNG or JPG exports.
4. Pick the project from the list in the tool's top bar and click **Run pipeline**.

Do not put client documents in a project until sending them through GitHub Copilot is approved for that client.

## Reset the sample

Delete the sample's outputs folder and the tool starts it again from the beginning:

```powershell
Remove-Item -Recurse -Force projects\sample-commercial-loan\outputs
```

## Update or remove the tool

- **Update:** `git pull`, then `npm install` and `npm run install-extension`.
- **Remove:** Extensions view → **SDLC Automation Tool** → Uninstall. Your projects are untouched.

## When something goes wrong

| You see | Do this |
| --- | --- |
| "Copilot is turned off because this folder is in Restricted Mode" | Click **Manage** in the yellow bar and choose **Trust** |
| "No GitHub Copilot model is available" | Sign in to GitHub Copilot from the Accounts icon, then try again |
| "VS Code did not allow this extension to use Copilot" | Run the step again and click **Allow** |
| "…does not let extensions use it" | Pick another model, or **Auto**, in the top bar. Your plan or organisation decides which models extensions may use |
| "Another step is still running" | Wait for it to finish; one step runs at a time |
| No **SDLC Tool** button in the status bar | The open folder must be the repo root (the one with `content/` and `projects/`) |
| A PDF is listed as "not supported" | Save it as `.docx` or `.txt` |
