import * as vscode from 'vscode';
import * as consts from '../consts';
import * as contests from '../contest/contest';
import * as item from './treeItem';
import * as notebook from '../notebook/notebook';
import { Result, Ok, Err } from "../consts";

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
                    element.question?.statics.points ? element.question.statics.points : undefined,
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
            const { result: contest, error } = contests.loadFromLocal();
            if (error) {
                console.log(error);
                return [item.Item.EmptyContest];
            }

            this.contest = contest;
            this.notebook = new notebook.Notebook(contest!.questions ?? []);
            return [item.Item.Contest];
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

export function getContest(): Result<contests.Contest> {
    if (tree.contest) {
        return Ok(tree.contest!);
    }
    return Err(new Error("Contest doesn't exist"));
}

export function getNotebook(): Result<notebook.Notebook> {
    if (tree.notebook) {
        return Ok(tree.notebook!);
    }
    return Err(new Error("Notebook doesn't exist"));
}

export function reloadContest(contest: contests.Contest | undefined): void {
    tree.contest = contest;
    tree.notebook = new notebook.Notebook(contest?.questions ?? []);
    tree.refresh();
}