import * as vscode from 'vscode';
import * as cmd from './commands';
import * as tree from './viewer/viewer';
import * as consts from './consts';
import * as serializer from './notebook/serializer';
import * as controller from './notebook/controller';
import * as configs from './configs';

function config() {
	const config = vscode.workspace.getConfiguration('elycode');
	const compilerPath = config.get<string>(consts.configs.compilerPath, '');
	const compileExtraParams = config.get<string>(consts.configs.compileExtraParams, '');
	const temporaryPath = config.get<string>(consts.configs.temporaryPath, '');
	const runningTimeLimit = config.get<number>(consts.configs.runningTimeLimit, 2);
	const runningMemoryLimit = config.get<number>(consts.configs.runningMemoryLimit, 256);

	configs.elycodeConfig.codingConfig = new configs.CodingConfig("");
	configs.elycodeConfig.compilerConfig = new configs.CompilerConfig("cpp", compilerPath, temporaryPath, compileExtraParams);
	configs.elycodeConfig.runnerConfig = new configs.RunnerConfig(runningTimeLimit, runningMemoryLimit);
}

function registerCommands() {
	vscode.commands.registerCommand(consts.commands.elycodeHello, cmd.elycodeHello);
	vscode.commands.registerCommand(consts.commands.openWorkspace, cmd.openWorkspace);
	vscode.commands.registerCommand(consts.commands.openContest, cmd.openContest);
	vscode.commands.registerCommand(consts.commands.reloadContest, cmd.reloadContest);
	vscode.commands.registerCommand(consts.commands.codingWindow, cmd.codingWindow);
}

export async function activate(context: vscode.ExtensionContext) {
	console.log('elycode is now active!');

	config();
	registerCommands();

	const components = [];
	components.push(vscode.workspace.registerNotebookSerializer(consts.commands.notebook, new serializer.Serializer()));
	components.push(await controller.Controller.new());
	components.push(vscode.window.registerTreeDataProvider(consts.commands.sidebarView, tree.getTree()));
	context.subscriptions.push(...components);
}
