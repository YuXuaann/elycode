import * as vscode from 'vscode';
import * as cmd from './commands';
import * as tree from './viewer/treeView';
import * as consts from './consts';
import * as serializer from './notebook/serializer';
import * as controller from './notebook/controller';

export async function activate(context: vscode.ExtensionContext) {
	console.log('elycode is now active!');

	vscode.commands.registerCommand(consts.CMD_HELLO, cmd.elycodeHello);
	vscode.commands.registerCommand(consts.CMD_OPEN_WORKSPACE, cmd.openWorkspace);
	vscode.commands.registerCommand(consts.CMD_OPEN_CONTEST, cmd.openContest);
	vscode.commands.registerCommand(consts.CMD_RELOAD_CONTEST, cmd.reloadContest);

	const components = [];
	components.push(vscode.window.registerTreeDataProvider(consts.CMD_SIDEBAR_VIEW, tree.getTree()));
	components.push(vscode.workspace.registerNotebookSerializer(consts.CMD_NOTEBOOK, new serializer.Serializer()));
	components.push(await controller.Controller.new());
	context.subscriptions.push(...components);
}
