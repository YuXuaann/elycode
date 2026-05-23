import * as vscode from 'vscode';
import * as contest from './contest';

export class Provider implements vscode.TreeDataProvider<contest.Question> {
	constructor(
		private readonly workspaceRoot: string,
		private readonly contestRawURL: string,
	) { }

	getTreeItem(element: contest.Question): vscode.TreeItem {
		return element;
	}

	getChildren(element?: contest.Question): vscode.ProviderResult<contest.Question[]> {
		if (!this.workspaceRoot) {
			return [];
		}

		if (!element) {
			return [
				new contest.Question('id0', 'Problem', [], vscode.TreeItemCollapsibleState.Expanded),
			];
		}

		return [];
	}
}

export function activate(context: vscode.ExtensionContext) {
	console.log('elycode is now active!');

	const disposables: vscode.Disposable[] = [];

	const elycodeMessage = vscode.commands.registerCommand('extension.elycode', () => {
		vscode.window.showInformationMessage('elycode works normally');
	});
	disposables.push(elycodeMessage);

	const provider = new Provider(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '', '');
	const treeView = vscode.window.registerTreeDataProvider('elycode.sidebarView', provider);
	disposables.push(treeView);

	context.subscriptions.push(...disposables);
}
