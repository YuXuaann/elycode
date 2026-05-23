import * as vscode from 'vscode';
import * as cmd from './cmd';
import * as tree from './treeView';
import * as consts from './const';

export function activate(_: vscode.ExtensionContext) {
	console.log('elycode is now active!');
	const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';

	vscode.commands.registerCommand(consts.CMD_HELLO, cmd.elycodeHello);
	vscode.commands.registerCommand(consts.CMD_OPEN_WORKSPACE, cmd.openWorkspace);

	const provider = new tree.Provider(root, '');
	vscode.window.registerTreeDataProvider(consts.CMD_SIDEBAR_VIEW, provider);
}
