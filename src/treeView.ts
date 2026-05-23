import * as vscode from 'vscode';
import * as contest from './contest';
import * as fs from 'fs';
import * as path from 'path';
import * as consts from './const';

function titleTreeItem(title: string, collapsibleState: vscode.TreeItemCollapsibleState, icon?: string): contest.Question {
    return new contest.Question('', title, [], collapsibleState, icon);
}

export class Provider implements vscode.TreeDataProvider<contest.Question> {
    constructor(
        private readonly workspaceRoot: string,
        private readonly contestRawURL: string,
    ) { }

    getTreeItem(element: contest.Question): vscode.TreeItem {
        return element;
    }

    getChildren(element?: contest.Question): vscode.ProviderResult<contest.Question[]> {
        if (!this.workspaceRoot) {
            // show welcome view
            return [];
        }

        if (!element) {
            // show problem head
            return [
                titleTreeItem('Problem', vscode.TreeItemCollapsibleState.Expanded, 'list-unordered'),
            ];
        }

        if (element?.label == 'Problem') {
            const recordPath = path.join(this.workspaceRoot, consts.CONTEST_RECORD);
            if (fs.existsSync(recordPath)) {
                const recordContent = fs.readFileSync(recordPath, 'utf-8');
                const record = JSON.parse(recordContent) as contest.Record;
                return record.questions ?? [];
            }

            return [
                titleTreeItem('Please set a competition.', vscode.TreeItemCollapsibleState.None, 'triangle-right'),
            ];
        }
    }
}