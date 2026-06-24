import * as vscode from 'vscode';
import * as cmd from './commands';
import * as tree from './viewer/viewer';
import * as consts from './consts';
import * as serializer from './notebook/serializer';
import * as controller from './notebook/controller';
import * as configs from './configs';
import * as utils from './utils';
import * as treeItem from './viewer/treeItem';

function config() {
	const config = vscode.workspace.getConfiguration('elycode');
	const compilerDetectMode = config.get<string>(consts.configs.compilerDetectMode, '');
	const compilerCustomPath = config.get<string>(consts.configs.compilerCustomPath, '');
	const compileExtraParams = config.get<string>(consts.configs.compileExtraParams, '');
	const runningTimeLimit = config.get<number>(consts.configs.runningTimeLimit, 2);
	const runningMemoryLimit = config.get<number>(consts.configs.runningMemoryLimit, 256);
	const templateMode = config.get<string>(consts.configs.templateMode, "auto");
	const customTemplate = config.get<string>(consts.configs.customTemplate, '');
	const codeforcesUserName = config.get<string>(consts.configs.codeforcesUserName, '');
	const updateContestInfoIntervalSecond = config.get<number>(consts.configs.updateContestInfoIntervalSecond, 60);

	const { result, error } = configs.CompilerConfig.new(compilerDetectMode, compilerCustomPath, compileExtraParams);
	if (error) {
		utils.vsPrint(error.message);
		vscode.window.showErrorMessage(`Failed to load compiler config: ${error.message ?? error}.`);
	} else {
		configs.elycodeConfig.compilerConfig = result!;
	}
	configs.elycodeConfig.platformConfig = new configs.PlatformConfig(codeforcesUserName, updateContestInfoIntervalSecond);
	configs.elycodeConfig.runnerConfig = new configs.RunnerConfig(runningTimeLimit, runningMemoryLimit, templateMode, customTemplate);
}

function registerCommands() {
	vscode.commands.registerCommand(consts.commands.elycodeHello, cmd.elycodeHello);
	vscode.commands.registerCommand(consts.commands.openWorkspace, cmd.openWorkspace);
	vscode.commands.registerCommand(consts.commands.addContest, cmd.addContest);
	vscode.commands.registerCommand(consts.commands.deleteContest, (item: treeItem.Item) => { cmd.deleteContest(item.contestId!); });
	vscode.commands.registerCommand(consts.commands.codingWindow, cmd.codingWindow);
	vscode.commands.registerCommand(consts.commands.refresh, cmd.refresh);
	vscode.commands.registerCommand(consts.commands.openURL, (url?: string) => { void cmd.openURL(url); });
	vscode.commands.registerCommand(consts.commands.openSubmitPage, (item: treeItem.Item) => { void cmd.openSubmitPage(item); });
}

function startBackgroundTasks(context: vscode.ExtensionContext) {
	// refresh task
	utils.startBackgroundTask(
		context,
		configs.elycodeConfig!.platformConfig!.updateContestInfoIntervalSecond * 1000,
		async () => { return await cmd.updateQuestionsStatistics(); },
		{
			onSuccess: () => tree.getTree().sync(),
			onError: (error) => console.error('Failed to auto refresh contest information:', error),
		}
	);
}


export async function activate(context: vscode.ExtensionContext) {
	utils.vsPrint('elycode is now active!');

	config();
	registerCommands();

	const components = [];
	components.push(vscode.workspace.registerNotebookSerializer(consts.commands.notebook, new serializer.Serializer()));
	components.push(await controller.Controller.new());
	components.push(vscode.window.registerTreeDataProvider(consts.commands.sidebarView, tree.getTree()));
	context.subscriptions.push(...components);

	startBackgroundTasks(context);
}
