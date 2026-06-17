import * as util from 'util';
import * as vscode from 'vscode';

export class RawNoteBookCellMeta {
    constructor(
        public readonly sampleIndex?: number,
    ) { }
}

export interface RawNotebookCell {
    source: string[];
    type: vscode.NotebookCellKind;
    meta: RawNoteBookCellMeta;
}

export class RawNoteBookMeta {
    constructor(
        public readonly questionId?: string,
    ) { }
}

export interface RawNotebook {
    '#sym'?: 'RawNotebook';
    cells: RawNotebookCell[];
    meta: RawNoteBookMeta;
}

export class Serializer implements vscode.NotebookSerializer {
    deserializeNotebook(
        content: Uint8Array,
        _: vscode.CancellationToken
    ): vscode.NotebookData {
        const contents = new util.TextDecoder().decode(content);

        const parsed = JSON.parse(contents) as RawNotebook;
        if (!parsed) {
            return new vscode.NotebookData([]);
        }

        const cells = parsed.cells?.map(
            cell => {
                const cellData = new vscode.NotebookCellData(
                    cell.type,
                    cell.source.join('\n'),
                    cell.type === vscode.NotebookCellKind.Code ? 'plaintext' : 'markdown'
                );
                cellData.metadata = cell.meta;
                return cellData;
            }
        );

        const notebookData = new vscode.NotebookData(cells);
        notebookData.metadata = parsed.meta;
        return notebookData;
    }

    serializeNotebook(
        data: vscode.NotebookData,
        _: vscode.CancellationToken
    ): Uint8Array {
        const contents: RawNotebookCell[] = [];

        for (const cell of data.cells) {
            contents.push({
                type: cell.kind,
                source: cell.value.split(/\r?\n/g),
                meta: cell.metadata ?? new RawNoteBookCellMeta(),
            });
        }

        const notebook: RawNotebook = { '#sym': 'RawNotebook', cells: contents, meta: data.metadata ?? new RawNoteBookMeta() };

        return new util.TextEncoder().encode(JSON.stringify(notebook, null, 2));
    }
}