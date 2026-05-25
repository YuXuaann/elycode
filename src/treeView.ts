import * as vscode from 'vscode';
import * as contests from './contest';
import * as consts from './const';


function titleTreeItem(title: string, collapsibleState: vscode.TreeItemCollapsibleState, icon?: string, command?: vscode.Command): contests.Question {
    return new contests.Question('', title, [], collapsibleState, [], icon, command);
}

export class Provider implements vscode.TreeDataProvider<contests.Question> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<contests.Question | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(
        private readonly workspaceRoot: string,
        public contest: contests.Contest | undefined,
    ) { }

    getTreeItem(element: contests.Question): vscode.TreeItem {
        if (element.examples.length > 0) {
            // show new window to display input & output
            return element;
        }
        return element;
    }

    getChildren(element?: contests.Question): vscode.ProviderResult<contests.Question[]> {
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
            const contest = contests.load(consts.root);
            if (contest) {
                this.contest = contest;
                return contest.questions;
            }

            return [
                titleTreeItem(
                    'Press this item to set a competition.',
                    vscode.TreeItemCollapsibleState.None,
                    'triangle-right',
                    {
                        command: consts.CMD_OPEN_CONTEST,
                        title: 'Open Contest',
                    },
                ),
            ];
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }
}

export const provider = new Provider(consts.root, undefined);