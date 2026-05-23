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
    vscode.window.showInformationMessage('Please open a contest URL in the input box.');
    const url = await vscode.window.showInputBox({ prompt: 'Enter contest URL' });
    if (url) {
        const contest = await contests.parse(url);
        if (contest) {
            tree.provider.contest = contest;
        } else {
            vscode.window.showErrorMessage('Failed to parse contest from the provided URL.');
        }
        contests.save(contest!, consts.root);
        tree.provider.refresh();
    } else {
        vscode.window.showErrorMessage('No URL entered.');
    }
}


export function elycodeHello() {
    // todo: add doctor
    vscode.window.showInformationMessage('elycode works normally');
}