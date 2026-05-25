import * as vscode from 'vscode';
import * as consts from './const';
import * as contests from './contest';
import * as tree from './treeView';
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
        contests.save(contest, consts.root);
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

export function reloadContest() {
    if (!consts.root) {
        vscode.window.showErrorMessage('No workspace opened.');
        return;
    }

    const recordPath = path.join(consts.root, consts.CONTEST_RECORD);

    try {
        if (fs.existsSync(recordPath)) {
            fs.unlinkSync(recordPath);
        }

        tree.provider.contest = undefined;
        tree.provider.refresh();
        void vscode.window.showInformationMessage('Contest reloaded.');
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

        const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'elycode-'));
        const samplePath = path.join(tempDir, `${questionId}-sample.txt`);

        const sampleContent = examples.map((example, index) => {
            const input = example.input ?? '';
            const output = example.output ?? '';
            return [
                `# Sample ${index + 1}`,
                '# Input',
                input,
                '# Output',
                output,
                '',
            ].join('\n');
        }).join('\n');

        fs.writeFileSync(samplePath, sampleContent || '# No samples available');
        const sampleUri = vscode.Uri.file(samplePath);
        const sampleDoc = await vscode.workspace.openTextDocument(sampleUri);
        await vscode.window.showTextDocument(sampleDoc, { viewColumn: vscode.ViewColumn.Two, preview: false });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to open coding window: ${message}`);
    }
}