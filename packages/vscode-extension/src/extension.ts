import * as vscode from 'vscode';
import { SdlcPanel } from './panel';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(vscode.commands.registerCommand('sdlcAutomation.open', () => SdlcPanel.show(context)));

  const button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  button.text = '$(checklist) SDLC Tool';
  button.tooltip = 'Open the SDLC Automation Tool';
  button.command = 'sdlcAutomation.open';
  button.show();
  context.subscriptions.push(button);

  if (process.env.SDLC_OPEN_ON_START === '1') SdlcPanel.show(context);
}

export function deactivate(): void {}
