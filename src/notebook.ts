import { TextDecoder, TextEncoder } from 'util';
import * as vscode from 'vscode';
import * as consts from './const';

interface RawNotebook {
    cells: RawNotebookCell[];
}

interface RawNotebookCell {
    source: string[];
    cell_type: 'code' | 'markdown';
}

export class Serializer implements vscode.NotebookSerializer {
    async deserializeNotebook(
        content: Uint8Array,
        _: vscode.CancellationToken
    ): Promise<vscode.NotebookData> {
        const contents = new TextDecoder().decode(content);

        let raw: RawNotebookCell[];
        try {
            raw = (JSON.parse(contents) as RawNotebook).cells;
        } catch {
            raw = [];
        }

        const cells = raw.map(
            item =>
                new vscode.NotebookCellData(
                    item.cell_type === 'code'
                        ? vscode.NotebookCellKind.Code
                        : vscode.NotebookCellKind.Markup,
                    item.source.join('\n'),
                    item.cell_type === 'code' ? 'python' : 'markdown'
                )
        );

        return new vscode.NotebookData(cells);
    }

    async serializeNotebook(
        data: vscode.NotebookData,
        _: vscode.CancellationToken
    ): Promise<Uint8Array> {
        const contents: RawNotebookCell[] = [];

        for (const cell of data.cells) {
            contents.push({
                cell_type: cell.kind === vscode.NotebookCellKind.Code ? 'code' : 'markdown',
                source: cell.value.split(/\r?\n/g)
            });
        }

        return new TextEncoder().encode(JSON.stringify(contents));
    }
}

export class Controller implements vscode.Disposable {
    readonly controllerId = consts.CMD_NOTEBOOK;
    readonly notebookType = consts.CMD_NOTEBOOK;
    readonly label = consts.CMD_NOTEBOOK;

    private readonly _controller: vscode.NotebookController;
    private _executionOrder = 0;

    constructor(languages: string[]) {
        this._controller = vscode.notebooks.createNotebookController(
            this.controllerId,
            this.notebookType,
            this.label
        );

        this._controller.supportedLanguages = languages;
        this._controller.supportsExecutionOrder = true;
        this._controller.executeHandler = this._execute.bind(this);
    }

    static async new(): Promise<Controller> {
        const languages = await vscode.languages.getLanguages();
        return new Controller(languages);
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

    private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
        const execution = this._controller.createNotebookCellExecution(cell);
        execution.executionOrder = ++this._executionOrder;
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