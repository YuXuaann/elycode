import * as meta from '../contest/meta';
import * as serializer from './serializer';
import * as vscode from 'vscode';

export function generateQuestionCell(question: meta.Question): serializer.RawNotebookCell {
    const description = (question.desription ?? '').replace(/\$\$\$/g, '\n$$$$');
    const formatInput = (question.formatInput ?? '').replace(/\$\$\$/g, '\n$$$$');
    const formatOutput = (question.formatOutput ?? '').replace(/\$\$\$/g, '\n$$$$');
    const hint = (question.hint ?? '').replace(/\$\$\$/g, '\n$$$$');

    const sources = [`### ${question.name}`];
    if (description) {
        sources.push(description);
    }
    if (formatInput) {
        sources.push(`#### Input`);
        sources.push(formatInput);
    }
    if (formatOutput) {
        sources.push(`#### Output`);
        sources.push(formatOutput);
    }
    if (hint) {
        sources.push(`#### Note`);
        sources.push(hint);
    }

    return {
        type: vscode.NotebookCellKind.Markup,
        source: sources,
        meta: new serializer.RawNoteBookCellMeta(),
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
        source: [`#### Sample ${id + 1}`],
        meta: new serializer.RawNoteBookCellMeta(id)
    });

    cells.push({
        type: vscode.NotebookCellKind.Code,
        source: [...inputLines],
        meta: new serializer.RawNoteBookCellMeta(id)
    });

    return cells;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function show(stdout: string, sampleOutput?: string): string {
    const normalize = (text: string): string => text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map((line) => line.replace(/[ \t]+$/, ''))
        .join('\n')
        .replace(/\n+$/, '');

    const actual = normalize(stdout);
    const expected = normalize(sampleOutput ?? '');

    const actualLines = actual.length > 0 ? actual.split('\n') : [''];
    const expectedLines = expected.length > 0 ? expected.split('\n') : [''];
    const totalLines = Math.max(actualLines.length, expectedLines.length);
    const statusLine = actual === expected
        ? '<strong style="color: #50fa7b;">Accept! Congratulation 🎉</strong>'
        : '<strong style="color: #ff5555;">Wrong Answer</strong>';

    const renderOutputBlock = (title: string, lines: string[], highlightColor: string): string[] => {
        const header = `<div style="font-weight: 700; margin-bottom: 6px; color: #f8f8f2;">${escapeHtml(title + ':')}</div>`;
        const block: string[] = [];

        if (totalLines > 0) {
            const line = lines[0] ?? '';
            const same = line === (title === 'your output' ? expectedLines[0] : actualLines[0]);
            const content = escapeHtml(line.length > 0 ? line : '(empty line)');
            const formattedLine = same
                ? content
                : `<span style="color: ${highlightColor};">${content}</span>`;

            block.push(`<div style="padding: 10px; background: #1e1e1e; border-radius: 6px; color: #e5e9f0; font-family: Consolas; white-space: pre-wrap;">${formattedLine}`);

            for (let i = 1; i < totalLines; i++) {
                const nextLine = lines[i] ?? '';
                const nextSame = nextLine === (title === 'your output' ? expectedLines[i] : actualLines[i]);
                const nextContent = escapeHtml(nextLine.length > 0 ? nextLine : '(empty line)');
                const nextFormattedLine = nextSame
                    ? nextContent
                    : `<span style="color: ${highlightColor};">${nextContent}</span>`;

                block.push(nextFormattedLine);
            }

            block.push('</div>');
        } else {
            block.push('<div style="padding: 10px; background: #1e1e1e; border-radius: 6px; color: #e5e9f0; font-family: Consolas; white-space: pre-wrap;">(empty output)</div>');
        }

        return [header, ...block];
    };

    if (!sampleOutput) {
        return renderOutputBlock('your output', actualLines, '#e5e9f0').join('\n');
    }

    return [
        statusLine,
        '',
        ...renderOutputBlock('your output', actualLines, '#ff6e6e'),
        '',
        ...renderOutputBlock('standard output', expectedLines, '#50fa7b'),
    ].join('\n');
}
