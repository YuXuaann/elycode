import { TextDecoder, TextEncoder } from 'util';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as cmd from './cmd';
import * as consts from './const';
import * as tree from './treeView';
import * as contests from './contest';

export interface RawNotebook {
    '#sym'?: 'RawNotebook';
    cells: RawNotebookCell[];
}

export interface RawNotebookCell {
    source: string[];
    cell_type: 'code' | 'markdown';
}

export class Serializer implements vscode.NotebookSerializer {
    async deserializeNotebook(
        content: Uint8Array,
        _: vscode.CancellationToken
    ): Promise<vscode.NotebookData> {
        const contents = new TextDecoder().decode(content);

        let raw: RawNotebookCell[] = [];
        try {
            const parsed = JSON.parse(contents) as RawNotebook | RawNotebookCell[];
            if (Array.isArray(parsed)) {
                raw = parsed;
            } else if (parsed?.cells) {
                raw = parsed.cells;
            }
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

        const notebook: RawNotebook = { '#sym': 'RawNotebook', cells: contents };

        return new TextEncoder().encode(JSON.stringify(notebook, null, 2));
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

    private async _execute(
        cells: vscode.NotebookCell[],
        notebook: vscode.NotebookDocument,
        _controller: vscode.NotebookController
    ): Promise<void> {
        for (const [index, cell] of cells.entries()) {
            await this._doExecution(cell, notebook, index);
        }
    }

    private async _doExecution(cell: vscode.NotebookCell, notebook: vscode.NotebookDocument, cellIndex: number): Promise<void> {
        const execution = this._controller.createNotebookCellExecution(cell);
        execution.executionOrder = ++this._executionOrder;
        execution.start(Date.now()); // Keep track of elapsed time to execute cell.

        try {
            const contest = tree.provider.contest ?? contests.load(consts.elycodeDir);
            if (!contest) {
                throw new Error('Contest data is not loaded.');
            }

            const notebookFile = notebook.uri.fsPath;
            const questionId = path.basename(notebookFile, path.extname(notebookFile));
            const question = contest.questions.find(q => q.id === questionId);
            if (!question) {
                throw new Error(`Cannot find contest question with id "${questionId}".`);
            }

            const example = question.examples[cellIndex];
            if (!example) {
                throw new Error(`No sample data found for cell #${cellIndex + 1}.`);
            }

            const sourcePath = path.join(consts.root, `${question.id}.cpp`);
            if (!fs.existsSync(sourcePath)) {
                throw new Error(`Source file ${question.id}.cpp is missing.`);
            }

            const output = await cmd.runCode(example.input ?? '');
            if (output === undefined) {
                execution.replaceOutput([
                    new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.error({
                            name: 'ExecutionError',
                            message: 'Code execution failed.',
                        })
                    ])
                ]);
                execution.end(false, Date.now());
                return;
            }

            const expected = normalizeLineEndings(example.output ?? '');
            const actual = normalizeLineEndings(output);

            if (expected === actual) {
                execution.replaceOutput([
                    new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.text(`Sample #${cellIndex + 1}: Accepted`)])
                ]);
                execution.end(true, Date.now());
                return;
            }

            const diff = formatDiff(expected, actual);
            execution.replaceOutput([
                new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.text(`Sample #${cellIndex + 1}: Wrong Answer\n\n${diff}`)
                ])
            ]);
            execution.end(false, Date.now());
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            execution.replaceOutput([
                new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.error({ name: 'ExecutionError', message })
                ])
            ]);
            execution.end(false, Date.now());
        }
    }
}

function normalizeLineEndings(text: string): string {
    return text.replace(/\r\n/g, '\n').trimEnd();
}

function formatDiff(expected: string, actual: string): string {
    const expectedLines = expected.split('\n');
    const actualLines = actual.split('\n');
    const maxLen = Math.max(expectedLines.length, actualLines.length);
    const diffLines: string[] = [];

    for (let i = 0; i < maxLen; i += 1) {
        const expectedLine = expectedLines[i] ?? '';
        const actualLine = actualLines[i] ?? '';
        if (expectedLine === actualLine) {
            diffLines.push(`  ${expectedLine}`);
        } else {
            diffLines.push(`- ${expectedLine}`);
            diffLines.push(`+ ${actualLine}`);
        }
    }

    return diffLines.join('\n');
}