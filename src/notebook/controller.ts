import * as vscode from 'vscode';
import * as consts from '../consts';
import * as runner from './runner';
import * as config from '../configs';
import * as path from 'path';
import * as tree from '../viewer/viewer';

export class Controller implements vscode.Disposable {
    private readonly codeRunner: runner.CodeRunner;
    private readonly _controller: vscode.NotebookController;

    constructor(controllerId: string, notebookType: string, label: string, languages: string[]) {
        this._controller = vscode.notebooks.createNotebookController(controllerId, notebookType, label);
        this._controller.supportedLanguages = languages;
        this._controller.supportsExecutionOrder = true;
        this._controller.executeHandler = this._execute.bind(this);
        this.codeRunner = new runner.CodeRunner(config.elycodeConfig.compilerConfig!, config.elycodeConfig.runnerConfig!);
    }

    static async new(): Promise<Controller> {
        const languages = await vscode.languages.getLanguages();
        return new Controller(consts.commands.notebook, consts.commands.notebook, consts.commands.notebook, languages);
    }

    dispose(): void {
        this._controller.dispose();
    }

    private async _execute(
        cells: vscode.NotebookCell[],
        notebook: vscode.NotebookDocument,
        _controller: vscode.NotebookController
    ) {
        const questionId = path.basename(notebook.uri.fsPath, path.extname(notebook.uri.fsPath));
        for (const [index, cell] of cells.entries()) {
            this._doExecution(index, cell, questionId);
        }
    }

    private async _doExecution(index: number, cell: vscode.NotebookCell, questionId: string) {
        const execution = this._controller.createNotebookCellExecution(cell);
        execution.start(Date.now());

        const codePath = path.join(consts.root, `${questionId}.cpp`);
        const { result: contest, error: getContestError } = tree.getContest();
        if (getContestError) {
            console.error(getContestError);
            return;
        }

        const question = contest!.questions?.find(q => q.id === questionId) ?? undefined;
        if (!question) {
            console.error(`Can not find ${questionId}`);
            return;
        }

        const { result, error: runError } = await this.codeRunner.run(codePath, question!.samples[index].input);
        if (runError) {
            console.error(`code compile failed: ${runError}`);
            return;
        }

        execution.replaceOutput([
            new vscode.NotebookCellOutput([
                vscode.NotebookCellOutputItem.text(result!)
            ])
        ]);
        execution.end(true, Date.now());
    }
}