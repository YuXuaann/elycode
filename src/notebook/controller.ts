import * as vscode from 'vscode';
import * as consts from '../consts';

export class Controller implements vscode.Disposable {
    private readonly _controller: vscode.NotebookController;

    constructor(controllerId: string, notebookType: string, label: string, languages: string[]) {
        this._controller = vscode.notebooks.createNotebookController(controllerId, notebookType, label);
        this._controller.supportedLanguages = languages;
        this._controller.supportsExecutionOrder = true;
        this._controller.executeHandler = this._execute.bind(this);
    }

    static async new(): Promise<Controller> {
        const languages = await vscode.languages.getLanguages();
        return new Controller(consts.commands.notebook, consts.commands.notebook, consts.commands.notebook, languages);
    }

    dispose(): void {
        this._controller.dispose();
    }

    private _execute(
        cells: vscode.NotebookCell[],
        _notebook: vscode.NotebookDocument,
        _controller: vscode.NotebookController
    ): void {
        for (const cell of cells) {
            this._doExecution(cell);
        }
    }

    private _doExecution(cell: vscode.NotebookCell): void {
        const execution = this._controller.createNotebookCellExecution(cell);
        execution.start(Date.now()); // Keep track of elapsed time to execute cell.

        /* Do some execution here; not implemented */

        execution.replaceOutput([
            new vscode.NotebookCellOutput([
                vscode.NotebookCellOutputItem.text('Dummy output text!')
            ])
        ]);
        execution.end(true, Date.now());
    }
}