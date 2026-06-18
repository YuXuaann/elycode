import * as vscode from 'vscode';
import * as consts from './consts';
import * as configs from './configs';
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

export async function addContest() {
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
        tree.addContest(contest);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to load contest: ${message}`);
    }
}

export async function deleteContest(contestId: string) {
    if (!consts.root) {
        vscode.window.showErrorMessage('No workspace opened.');
        return;
    }

    const { result: contest, error } = tree.getContest(contestId);
    if (error) {
        vscode.window.showErrorMessage(`Contest doesn't exist: ${error}`);
        return;
    }

    const cppFiles = contest!.questions?.map((question) => `${question.id}.cpp`) ?? [];

    const warnings = ['Elycode will delete the contest record.'];
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
        vscode.window.showInformationMessage('Contest delete cancelled.');
        return;
    }

    try {
        const removedCppDir = path.join(consts.root!, contest!.meta.name);
        if (fs.existsSync(removedCppDir)) {
            fs.rmSync(removedCppDir, { recursive: true, force: true });
        }
        const removedRecord = path.join(consts.elycodeDir, contest!.meta.name);
        if (fs.existsSync(removedRecord)) {
            fs.rmSync(removedRecord, { recursive: true, force: true });
        }
        tree.deleteContest(contestId);
        vscode.window.showInformationMessage('Contest and generated files removed.');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to delete contest: ${message}`);
    }
}

export function elycodeHello() {
    // todo: add doctor
    vscode.window.showInformationMessage('elycode works normally');
}

export async function codingWindow(contestId: string, questionId: string) {
    const { result: contest, error } = tree.getContest(contestId);
    if (error) {
        vscode.window.showErrorMessage(`Contest doesn't exist: ${error}`);
        return;
    }

    // todo: only support cpp currently
    const cppFileDir = path.join(consts.root, `${contest!.meta.name}`);
    const cppFilePath = path.join(cppFileDir, `${questionId}.cpp`);
    if (!fs.existsSync(cppFilePath)) {
        fs.mkdirSync(cppFileDir, { recursive: true });
        fs.writeFileSync(cppFilePath, configs!.elycodeConfig!.runnerConfig!.template!);
    }
    const cppFileUri = vscode.Uri.file(cppFilePath);
    const cppDoc = await vscode.workspace.openTextDocument(cppFileUri);
    await vscode.window.showTextDocument(cppDoc, { viewColumn: vscode.ViewColumn.One, preview: false });

    const notebookDir = path.join(consts.elycodeDir, `${contest!.meta.name}`);
    const notebookPath = path.join(notebookDir, `${questionId}${consts.QUESTION_NOTE}`);
    if (!fs.existsSync(notebookPath)) {
        fs.mkdirSync(notebookDir, { recursive: true });
        const { result: notebook, error } = tree.getNotebook(contestId);
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
}

export function refresh() {
    vscode.window.showInformationMessage('Contest infomation updated.');
}