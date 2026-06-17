import * as vscode from 'vscode';
import * as consts from '../consts';
import * as runner from './runner';
import * as serializer from './serializer';
import * as config from '../configs';
import * as path from 'path';
import * as tree from '../viewer/viewer';
import { Result, Ok, Err } from '../utils';

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
        const meta = notebook.metadata as serializer.RawNoteBookMeta | undefined;

        for (const cell of cells) {
            const execution = this._controller.createNotebookCellExecution(cell);
            execution.start(Date.now());
            const { result, error } = await this._doExecution(cell, meta?.contestId ?? '', meta?.questionId ?? '');
            let output: vscode.NotebookCellOutput;
            if (error) {
                output = new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stderr(error.message)]);
            } else {
                output = new vscode.NotebookCellOutput([new vscode.NotebookCellOutputItem(Buffer.from(result!, 'utf-8'), 'text/markdown')]);
            }
            execution.replaceOutput([output]);
            execution.end(true, Date.now());
        }
    }

    private async _doExecution(cell: vscode.NotebookCell, contestId: string, questionId: string): Promise<Result<string>> {
        const meta = cell.metadata as { sampleIndex?: number } | undefined;
        const sampleIndex = meta?.sampleIndex ?? undefined;

        const { result: contest, error: getContestError } = tree.getContest(contestId);
        if (getContestError) {
            return Err(new Error(getContestError.message));
        }
        const codePath = path.join(consts.root, contest!.meta.name, `${questionId}.cpp`);

        const question = contest!.questions?.find(q => q.id === questionId) ?? undefined;
        if (!question) {
            return Err(new Error(`Can not find ${questionId}`));
        }

        const cellSampleOutput = sampleIndex == undefined ? undefined : question!.samples[sampleIndex!]?.output ?? undefined;
        const cellInput = cell.document.getText();
        const { result: runResult, error: runError } = await this.codeRunner.run(codePath, cellInput, cellSampleOutput);
        if (runError) {
            return Err(new Error(runError.message));
        }

        return Ok(runResult!);
    }
}