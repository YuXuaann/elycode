import * as vscode from 'vscode';
import * as cmd from './commands';
import * as tree from './viewer/treeView';
import * as consts from './consts';
import * as serializer from './notebook/serializer';
import * as controller from './notebook/controller';

export async function activate(context: vscode.ExtensionContext) {
	console.log('elycode is now active!');

	vscode.commands.registerCommand(consts.commands.elycodeHello, cmd.elycodeHello);
	vscode.commands.registerCommand(consts.commands.openWorkspace, cmd.openWorkspace);
	vscode.commands.registerCommand(consts.commands.openContest, cmd.openContest);
	vscode.commands.registerCommand(consts.commands.reloadContest, cmd.reloadContest);

	const components = [];
	components.push(vscode.window.registerTreeDataProvider(consts.commands.sidebarView, tree.getTree()));
	components.push(vscode.workspace.registerNotebookSerializer(consts.commands.notebook, new serializer.Serializer()));
	components.push(await controller.Controller.new());
	context.subscriptions.push(...components);
}
