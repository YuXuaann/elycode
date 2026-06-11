import * as vscode from 'vscode';
import * as consts from '../consts';
import * as contests from '../contest/contest';
import * as item from './treeItem';
import * as notebook from '../notebook/notebook';

export class TreeView implements vscode.TreeDataProvider<item.Item> {
    contest?: contests.Contest;
    notebook?: notebook.Notebook;

    private readonly _onDidChangeTreeData = new vscode.EventEmitter<item.Item | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    getTreeItem(element: item.Item): vscode.TreeItem {
        switch (element.type) {
            case item.ItemType.EmptyContest:
                return new item.TreeItem(
                    'Set a competition.',
                    vscode.TreeItemCollapsibleState.None,
                    'triangle-right',
                    undefined,
                    { command: consts.commands.openContest, title: 'Open Contest', arguments: [] }
                );
            case item.ItemType.Contest:
                return new item.TreeItem(
                    this.contest?.meta.name ?? 'Unknown Contest',
                    vscode.TreeItemCollapsibleState.Expanded,
                    'list-unordered'
                );
            case item.ItemType.Question:
                return new item.TreeItem(
                    element.question?.name ?? 'Unknown Question',
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    element.question?.statics.points ? `${element.question.statics.points} pts` : undefined,
                    { command: consts.commands.codingWindow, title: 'Open Coding Window', arguments: [element.question?.id ?? ''] }
                );
            default:
                return new item.TreeItem('Unknown Item', vscode.TreeItemCollapsibleState.None);
        }
    }

    getChildren(element?: item.Item): vscode.ProviderResult<item.Item[]> {
        if (!consts.root) {
            // show welcome view
            return [];
        }

        if (!element) {
            const contest = contests.loadFromLocal();
            if (contest) {
                reloadContest(contest);
                return [item.Item.Contest];
            }
            return [item.Item.EmptyContest];
        }

        if (element.type === item.ItemType.Contest) {
            return this.contest?.questions.map((q) => new item.Item(item.ItemType.Question, q)) ?? [];
        }

        return [];
    }

    refresh() { this._onDidChangeTreeData.fire(undefined); }
}

const tree = new TreeView();

export function getTree(): TreeView {
    return tree;
}

export function getContest(): contests.Contest | undefined {
    return tree.contest;
}

export function getNotebook(): notebook.Notebook | undefined {
    return tree.notebook;
}

export function reloadContest(contest: contests.Contest | undefined): void {
    tree.contest = contest;
    tree.notebook = new notebook.Notebook(contest?.questions ?? []);
    tree.refresh();
}