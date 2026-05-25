import * as vscode from 'vscode';
import * as consts from './const';
import * as contests from './contest';
import * as tree from './treeView';

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


export function elycodeHello() {
    // todo: add doctor
    vscode.window.showInformationMessage('elycode works normally');
}