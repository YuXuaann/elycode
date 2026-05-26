import * as vscode from 'vscode';
import * as cmd from './cmd';
import * as tree from './treeView';
import * as consts from './const';
import * as notebook from './notebook';

export async function activate(context: vscode.ExtensionContext) {
	console.log('elycode is now active!');

	vscode.commands.registerCommand(consts.CMD_HELLO, cmd.elycodeHello);
	vscode.commands.registerCommand(consts.CMD_OPEN_WORKSPACE, cmd.openWorkspace);
	vscode.commands.registerCommand(consts.CMD_OPEN_CONTEST, cmd.openContest);
	vscode.commands.registerCommand(consts.CMD_RELOAD_CONTEST, cmd.reloadContest);
	vscode.commands.registerCommand(consts.CMD_CODING_WINDOW, cmd.codingWindow);

	const components = [];
	components.push(vscode.window.registerTreeDataProvider(consts.CMD_SIDEBAR_VIEW, tree.provider));
	components.push(vscode.workspace.registerNotebookSerializer(consts.CMD_NOTEBOOK, new notebook.Serializer()));
	components.push(await notebook.Controller.new());
	context.subscriptions.push(...components);
}
