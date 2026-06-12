import * as vscode from 'vscode';
import * as consts from './consts';
import * as contests from './contest/contest';
import * as tree from './viewer/viewer';
import * as fs from 'fs';
import * as path from 'path';

export async function openWorkspace() {
    const selected = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Open Workspace',
    });
    if (selected && selected.length > 0) {
        await vscode.commands.executeCommand(consts.commands.openWorkspace, selected[0]);
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

            const { result: contest, error } = await contests.loadFromURL(url);
            if (error) {
                throw error;
            }
            return contest!;
        });
        contests.saveToLocal(contest);
        tree.reloadContest(contest);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to load contest: ${message}`);
    }
}

export async function reloadContest() {
    if (!consts.root) {
        vscode.window.showErrorMessage('No workspace opened.');
        return;
    }

    const { result: contest, error } = tree.getContest();
    if (error) {
        vscode.window.showErrorMessage(`Contest doesn't exist: ${error}`);
        return;
    }

    const cppFiles = contest!.questions?.map((question) => `${question.id}.cpp`) ?? [];

    const warnings = ['Reloading the contest will delete the saved contest record.'];
    if (cppFiles.length) {
        warnings.push(`It will also remove the following C++ files: ${cppFiles.join(', ')}`);
    }
    warnings.push('Do you want to continue?');
    const confirm = await vscode.window.showWarningMessage(
        warnings.join(' '),
        { modal: true },
        'Delete'
    );

    if (confirm !== 'Delete') {
        vscode.window.showInformationMessage('Contest reload cancelled.');
        return;
    }

    try {
        const removedFiles = cppFiles.map((file) => path.join(consts.root!, file));
        for (const filePath of removedFiles) {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        if (fs.existsSync(consts.elycodeDir)) {
            fs.rmSync(consts.elycodeDir, { recursive: true, force: true });
        }
        tree.reloadContest(undefined);
        vscode.window.showInformationMessage('Contest reloaded and generated files removed.');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to reload contest: ${message}`);
    }
}

export function elycodeHello() {
    // todo: add doctor
    vscode.window.showInformationMessage('elycode works normally');
}

export async function codingWindow(questionId: string) {
    const notebookPath = path.join(consts.elycodeDir, `${questionId}.elynote`);
    if (!fs.existsSync(notebookPath)) {
        console.log("not exist");
        const { result: notebook, error } = tree.getNotebook();
        if (error) {
            vscode.window.showErrorMessage(`Notebook doesn't exist: ${error}`);
            return;
        }
        const content = notebook!.generate(questionId);
        fs.writeFileSync(notebookPath, JSON.stringify(content, null, 2), 'utf-8');
    }
    const notebookUri = vscode.Uri.file(notebookPath);
    const notebookDoc = await vscode.workspace.openNotebookDocument(notebookUri);
    await vscode.window.showNotebookDocument(notebookDoc, { viewColumn: vscode.ViewColumn.Two, preview: false });
    console.log("ok!");
}