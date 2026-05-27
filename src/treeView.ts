import * as vscode from 'vscode';
import * as contests from './contest';
import * as consts from './const';


function titleTreeItem(title: string, collapsibleState: vscode.TreeItemCollapsibleState, icon?: string, command?: vscode.Command): contests.Question {
    return new contests.Question('', title, [], collapsibleState, [], icon, command);
}

export class Provider implements vscode.TreeDataProvider<contests.Question> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<contests.Question | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    private rootTitle = 'Problem';

    constructor(
        private readonly workspaceRoot: string,
        public contest: contests.Contest | undefined,
    ) { }

    getTreeItem(element: contests.Question): vscode.TreeItem {
        return element;
    }

    getChildren(element?: contests.Question): vscode.ProviderResult<contests.Question[]> {
        if (!this.workspaceRoot) {
            // show welcome view
            return [];
        }

        if (!element) {
            const contest = contests.load(consts.elycodeDir);
            if (contest) {
                this.contest = contest;
                this.rootTitle = `[${contest.meta.platform ?? 'Unknown'}]${contest.meta.name ?? this.rootTitle}`;
                return [
                    titleTreeItem(this.rootTitle, vscode.TreeItemCollapsibleState.Expanded, 'list-unordered'),
                ];
            }

            return [
                titleTreeItem(
                    'Set a competition.',
                    vscode.TreeItemCollapsibleState.None,
                    'triangle-right',
                    {
                        command: consts.CMD_OPEN_CONTEST,
                        title: 'Open Contest',
                    },
                ),
            ];
        }

        if (element.label === this.rootTitle && this.contest) {
            return this.contest.questions;
        }

        return [];
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }
}

export const provider = new Provider(consts.root, undefined);