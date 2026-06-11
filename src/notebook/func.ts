import * as meta from '../contest/meta';
import * as serializer from './serializer';
import * as vscode from 'vscode';

export function generateCellsBySample(id: number, sample: meta.Sample): serializer.RawNotebookCell[] {
    if (!sample) {
        return [];
    }

    const cells: serializer.RawNotebookCell[] = [];
    const inputLines = (sample.input ?? '').split(/\r?\n/g);

    cells.push({
        type: vscode.NotebookCellKind.Markup,
        source: [`#### Sample ${id}`],
    });

    cells.push({
        type: vscode.NotebookCellKind.Code,
        source: [...inputLines],
    });

    return cells;
}