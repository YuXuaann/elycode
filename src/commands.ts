import * as vscode from 'vscode';
import * as consts from './consts';
import * as contests from './contest/contest';
import * as tree from './viewer/treeView';
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

            const contest = await contests.loadFromURL(url);
            if (!contest) {
                throw new Error('Failed to load contest from the provided URL.');
            }
            return contest;
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

    const contest = tree.getContest();
    const cppFiles = contest?.questions?.map((question) => `${question.id}.cpp`) ?? [];

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
        void vscode.window.showInformationMessage('Contest reload cancelled.');
        return;
    }

    try {
        const removedFiles = [consts.elycodeDir, cppFiles.map((file) => path.join(consts.root!, file))].flat();
        for (const filePath of removedFiles) {
            fs.unlinkSync(filePath);
        }
        tree.reloadContest(undefined);
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
