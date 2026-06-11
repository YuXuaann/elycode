import { TextDecoder, TextEncoder } from 'util';
import * as vscode from 'vscode';

export interface RawNotebookCell {
    source: string[];
    type: vscode.NotebookCellKind;
}

export interface RawNotebook {
    '#sym'?: 'RawNotebook';
    cells: RawNotebookCell[];
}

export class Serializer implements vscode.NotebookSerializer {
    deserializeNotebook(
        content: Uint8Array,
        _: vscode.CancellationToken
    ): vscode.NotebookData {
        const contents = new TextDecoder().decode(content);

        const parsed = JSON.parse(contents) as RawNotebook;
        if (!parsed) {
            return new vscode.NotebookData([]);
        }

        const cells = parsed.cells?.map(
            cell =>
                new vscode.NotebookCellData(
                    cell.type,
                    cell.source.join('\n'),
                    cell.type === vscode.NotebookCellKind.Code ? 'plaintext' : 'markdown'
                )
        );

        return new vscode.NotebookData(cells);
    }

    serializeNotebook(
        data: vscode.NotebookData,
        _: vscode.CancellationToken
    ): Uint8Array {
        const contents: RawNotebookCell[] = [];

        for (const cell of data.cells) {
            contents.push({
                type: cell.kind,
                source: cell.value.split(/\r?\n/g)
            });
        }

        const notebook: RawNotebook = { '#sym': 'RawNotebook', cells: contents };

        return new TextEncoder().encode(JSON.stringify(notebook, null, 2));
    }
}