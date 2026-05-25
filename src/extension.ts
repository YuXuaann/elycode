import * as vscode from 'vscode';
import * as cmd from './cmd';
import * as tree from './treeView';
import * as consts from './const';

export function activate(_: vscode.ExtensionContext) {
	console.log('elycode is now active!');

	vscode.commands.registerCommand(consts.CMD_HELLO, cmd.elycodeHello);
	vscode.commands.registerCommand(consts.CMD_OPEN_WORKSPACE, cmd.openWorkspace);
	vscode.commands.registerCommand(consts.CMD_OPEN_CONTEST, cmd.openContest);
	vscode.commands.registerCommand(consts.CMD_RELOAD_CONTEST, cmd.reloadContest);

	vscode.window.registerTreeDataProvider(consts.CMD_SIDEBAR_VIEW, tree.provider);
}
