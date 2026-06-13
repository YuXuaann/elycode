import * as meta from '../contest/meta';
import * as serializer from './serializer';
import * as vscode from 'vscode';

export function generateQuestionCell(question: meta.Question): serializer.RawNotebookCell {
    const description = (question.desription ?? '').replace(/\$\$\$/g, '\n$$$$');

    return {
        type: vscode.NotebookCellKind.Markup,
        source: [`#### ${question.name}`, description],
    };
}

export function generateSampleCells(id: number, sample: meta.Sample): serializer.RawNotebookCell[] {
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