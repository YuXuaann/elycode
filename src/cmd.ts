import * as vscode from 'vscode';
import * as consts from './const';
import * as contests from './contest';
import * as tree from './treeView';
import * as utils from './utils';
import type { RawNotebook, RawNotebookCell } from './notebook';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export async function openWorkspace() {
    const selected = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Open Workspace',
    });
    if (selected && selected.length > 0) {
        await vscode.commands.executeCommand(consts.CMD_OPEN_WORKSPACE, selected[0]);
    }
}

export async function openContest() {
    void vscode.window.showInformationMessage('Please enter a contest URL in the input box.');
    const url = await vscode.window.showInputBox({ prompt: 'Enter contest URL' });
    if (!url) {
        vscode.window.showErrorMessage('No URL entered.');
        return;
    }

    try {
        const contest = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Loading contest data...',
            cancellable: true,
        }, async (_, token) => {
            token.onCancellationRequested(() => {
                throw new Error('User cancelled');
            });

            const parsed = await contests.parse(url);
            if (!parsed) {
                throw new Error('Failed to parse contest from the provided URL.');
            }
            return parsed;
        });
        contests.setQuestionCommands(contest, (q) => ({
            command: consts.CMD_CODING_WINDOW,
            title: 'Open Coding Window',
            arguments: [q.id, q.examples],
        }));

        tree.provider.contest = contest;
        contests.save(contest, consts.elycodeDir);
        tree.provider.refresh();
        void vscode.window.showInformationMessage('Contest loaded successfully.');
    } catch (error) {
        if (error instanceof Error && error.message === 'User cancelled') {
            void vscode.window.showInformationMessage('Contest loading cancelled.');
            return;
        }

        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to load contest: ${message}`);
    }
}

export async function reloadContest() {
    if (!consts.root) {
        vscode.window.showErrorMessage('No workspace opened.');
        return;
    }

    const recordDir = consts.elycodeDir;
    const existingContest = tree.provider.contest ?? contests.load(consts.elycodeDir);
    const cppFiles = new Set<string>();

    if (existingContest?.questions?.length) {
        for (const question of existingContest.questions) {
            const filePath = path.join(consts.root, `${question.id}.cpp`);
            cppFiles.add(filePath);
        }
    }

    const cppFileNames = Array.from(cppFiles).map((filePath) => path.basename(filePath));
    const warningMessageParts = [
        'Reloading the contest will delete the saved contest record.',
    ];

    if (cppFileNames.length) {
        warningMessageParts.push(`It will also remove the following C++ files: ${cppFileNames.join(', ')}`);
    }

    warningMessageParts.push('Do you want to continue?');

    const confirm = await vscode.window.showWarningMessage(
        warningMessageParts.join(' '),
        { modal: true },
        'Delete'
    );

    if (confirm !== 'Delete') {
        void vscode.window.showInformationMessage('Contest reload cancelled.');
        return;
    }

    try {
        if (fs.existsSync(recordDir)) {
            fs.rmSync(recordDir, { recursive: true, force: true });
        }

        for (const filePath of cppFiles) {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        tree.provider.contest = undefined;
        tree.provider.refresh();
        void vscode.window.showInformationMessage('Contest reloaded and generated files removed.');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to reload contest: ${message}`);
    }
}

export function elycodeHello() {
    // todo: add doctor
    vscode.window.showInformationMessage('elycode works normally');
}

export async function codingWindow(questionId: string, examples: contests.Example[]) {
    if (!tree.provider.contest?.meta?.id) {
        vscode.window.showErrorMessage('Contest is not loaded.');
        return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('Please open a workspace first.');
        return;
    }

    const problemFilename = `${questionId}.cpp`;
    const problemUri = vscode.Uri.joinPath(workspaceFolder.uri, problemFilename);

    try {
        const problemExists = fs.existsSync(problemUri.fsPath);
        if (!problemExists) {
            fs.writeFileSync(problemUri.fsPath, '// Start coding here\n');
        }

        const doc = await vscode.workspace.openTextDocument(problemUri);
        await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.One, preview: false });

        const notebookPath = path.join(consts.elycodeDir, `${questionId}.elynote`);
        const containerStyle = 'style="display:inline-block; width:fit-content; max-width:100%; border:1px solid #594dff; border-radius:6px; padding:12px; background:#1e1e1e; box-sizing:border-box;"';
        const preStyle = 'style="margin:0; white-space:pre-wrap; font-family:var(--vscode-editor-font-family);"';
        const escapeHtml = (value: string): string => value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        const removeLeadingEmpty = (lines: string[]): string[] => {
            let start = 0;
            while (start < lines.length && lines[start].trim().length === 0) {
                start += 1;
            }
            return lines.slice(start);
        };
        const createBlock = (contentLines: string[]): string[] => {
            const content = escapeHtml(contentLines.join('\n'));
            return [
                `<div ${containerStyle}>`,
                `<pre ${preStyle}>${content}</pre>`,
                '</div>',
            ];
        };
        const cells: RawNotebookCell[] = examples.length ? examples.map((example) => {
            const inputLines = removeLeadingEmpty((example.input ?? '').split(/\r?\n/g));
            const outputLines = removeLeadingEmpty((example.output ?? '').split(/\r?\n/g));
            const cellLines: string[] = [
                '#### Input',
                ...createBlock(inputLines),
            ];

            if (outputLines.length) {
                cellLines.push('');
                cellLines.push('#### Output');
                cellLines.push(...createBlock(outputLines));
            }

            return {
                cell_type: 'markdown',
                source: cellLines,
            };
        }) : [
            {
                cell_type: 'markdown',
                source: ['#### No samples available'],
            }
        ];

        const notebookData: RawNotebook = {
            '#sym': 'RawNotebook',
            cells,
        };

        fs.writeFileSync(notebookPath, JSON.stringify(notebookData, null, 2), 'utf-8');
        const notebookUri = vscode.Uri.file(notebookPath);
        const notebookDoc = await vscode.workspace.openNotebookDocument(notebookUri);
        await vscode.window.showNotebookDocument(notebookDoc, { viewColumn: vscode.ViewColumn.Two, preview: false });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to open coding window: ${message}`);
    }
}

export function runCode(input: string): string | undefined {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor || !activeEditor.document.fileName.endsWith('.cpp') || !activeEditor.document.fileName.endsWith('.c')) {
        void vscode.window.showErrorMessage('No active C/C++ file to run.');
        return undefined;
    }

    let ret: string | undefined = undefined;

    void vscode.window.withProgress({
        location: vscode.ProgressLocation.Window,
        title: 'Compiling and running...'
    }, async () => {
        const sourcePath = activeEditor.document.uri.fsPath;

        const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'elycode-run-'));
        const executablePath = path.join(tempDir, 'submission.out');

        try {
            await utils.compileCpp(sourcePath, executablePath);
        } catch {
            console.error('Compilation failed');
            return;
        }

        try {
            const result = await utils.runExecutable(executablePath, input);
            if (result.error) {
                vscode.window.showErrorMessage(`Execution failed: ${result.error.message}`);
                return;
            }
            ret = result.stdout;
        } catch {
            console.error('Execution failed');
            return;
        }
    });

    return ret;
}
