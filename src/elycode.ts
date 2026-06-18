import * as vscode from 'vscode';
import * as cmd from './commands';
import * as tree from './viewer/viewer';
import * as consts from './consts';
import * as serializer from './notebook/serializer';
import * as controller from './notebook/controller';
import * as configs from './configs';
import * as treeItem from './viewer/treeItem';

function config() {
	const config = vscode.workspace.getConfiguration('elycode');
	const compilerDetectMode = config.get<string>(consts.configs.compilerDetectMode, '');
	const compilerCustomPath = config.get<string>(consts.configs.compilerCustomPath, '');
	const compileExtraParams = config.get<string>(consts.configs.compileExtraParams, '');
	const temporaryPath = config.get<string>(consts.configs.temporaryPath, '');
	const runningTimeLimit = config.get<number>(consts.configs.runningTimeLimit, 2);
	const runningMemoryLimit = config.get<number>(consts.configs.runningMemoryLimit, 256);
	const templateMode = config.get<string>(consts.configs.templateMode, "auto");
	const customTemplate = config.get<string>(consts.configs.customTemplate, '');

	const { result, error } = configs.CompilerConfig.new(compilerDetectMode, compilerCustomPath, temporaryPath, compileExtraParams);
	if (error) {
		vscode.window.showErrorMessage(`Failed to load compiler config: ${error}`);
	}
	configs.elycodeConfig.compilerConfig = result!;
	configs.elycodeConfig.runnerConfig = new configs.RunnerConfig(runningTimeLimit, runningMemoryLimit, templateMode, customTemplate);
}

function registerCommands() {
	vscode.commands.registerCommand(consts.commands.elycodeHello, cmd.elycodeHello);
	vscode.commands.registerCommand(consts.commands.openWorkspace, cmd.openWorkspace);
	vscode.commands.registerCommand(consts.commands.addContest, cmd.addContest);
	vscode.commands.registerCommand(consts.commands.deleteContest, (item: treeItem.Item) => { cmd.deleteContest(item.contestId!); });
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
