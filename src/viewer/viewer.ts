import * as vscode from 'vscode';
import * as consts from '../consts';
import * as meta from '../contest/meta';
import * as contest from '../contest/contest';
import * as item from './treeItem';
import * as notebook from '../notebook/notebook';
import { Result, Ok, Err } from "../utils";

export class TreeView implements vscode.TreeDataProvider<item.Item> {
    notebooks: Map<string, notebook.Notebook>;
    contests: Map<string, contest.Contest>;

    constructor(
        contests: contest.Contest[],
    ) {
        this.contests = new Map(contests.map((c) => [c.meta.id, c]));
        this.notebooks = new Map(contests.map((c) => [c.meta.id, new notebook.Notebook(c.meta.id, c.questions ?? [])]));
    }

    reload(
        contests: contest.Contest[],
    ) {
        this.contests = new Map(contests.map((c) => [c.meta.id, c]));
        this.notebooks = new Map(contests.map((c) => [c.meta.id, new notebook.Notebook(c.meta.id, c.questions ?? [])]));
    }

    private readonly _onDidChangeTreeData = new vscode.EventEmitter<item.Item | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    getTreeItem(element: item.Item): vscode.TreeItem {
        switch (element.type) {
            case item.ItemType.AddContest:
                return new item.TreeItem(
                    item.ItemType.AddContest,
                    'Add a competition.',
                    vscode.TreeItemCollapsibleState.None,
                    'add',
                    undefined,
                    { command: consts.commands.addContest, title: 'Add Contest', arguments: [] }
                );
            case item.ItemType.Contest: {
                const contest = this.contests.get(element.contestId!);
                return new item.TreeItem(
                    item.ItemType.Contest,
                    contest?.meta.name ?? 'Unknown Contest',
                    vscode.TreeItemCollapsibleState.Expanded,
                    'list-unordered'
                );
            }
            case item.ItemType.Question: {
                const contest = this.contests.get(element.contestId!);
                const question = contest?.questions.find((q) => (q.id === element.questionId!));
                return new item.TreeItem(
                    item.ItemType.Question,
                    question?.name ?? 'Unknown Question',
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    question?.statics.points ? question.statics.points : undefined,
                    { command: consts.commands.codingWindow, title: 'Open Coding Window', arguments: [element.contestId!, question?.id ?? ''] }
                );
            }
            case item.ItemType.ErrorMessage:
                return new item.TreeItem(item.ItemType.ErrorMessage, "Elycode run with error", vscode.TreeItemCollapsibleState.None);
            default:
                return new item.TreeItem(item.ItemType.ErrorMessage, 'Unknown Item', vscode.TreeItemCollapsibleState.None);
        }
    }

    getChildren(element?: item.Item): vscode.ProviderResult<item.Item[]> {
        if (!consts.root) {
            // show welcome view
            return [];
        }

        if (!element) {
            // todo: performance improvement
            const { result: contests, error } = contest.loadFromLocal();
            if (error) {
                vscode.window.showErrorMessage(error.message);
                return [item.Item.ErrorMessage];
            }
            this.reload(contests!.contests);

            const items: item.Item[] = [];
            this.contests!.forEach((contest, _) => {
                items.push(new item.Item(item.ItemType.Contest, undefined, contest.meta.id));
            });
            if (items.length === 0) {
                items.push(item.Item.AddContest);
            }
            return items;
        }

        switch (element!.type) {
            case item.ItemType.Contest: {
                const contest = this.contests.get(element.contestId!);
                return contest?.questions.map((q) => new item.Item(item.ItemType.Question, q.id, element.contestId!)) ?? [];
            }
            case item.ItemType.Question:
            default:
                return [item.Item.ErrorMessage];
        }
    }

    sync() {
        const record = new meta.Record(Array.from(this.contests.values()));
        contest.saveToLocal(record);
        this._onDidChangeTreeData.fire(undefined);
    }
}

const tree = new TreeView([]);

export function getTree(): TreeView {
    return tree;
}


export function getContest(contestId: string): Result<contest.Contest> {
    const contest = tree.contests.get(contestId);
    if (!contest) {
        return Err(new Error("Contest doesn't exist"));
    }
    return Ok(contest);
}

export function getNotebook(contestId: string): Result<notebook.Notebook> {
    const notebook = tree.notebooks.get(contestId);
    if (!notebook) {
        return Err(new Error("Contest doesn't exist"));
    }
    return Ok(notebook);
}


export function addContest(target: contest.Contest): void {
    const contest = tree.contests.get(target.meta.id);
    if (contest) {
        vscode.window.showInformationMessage(`${target.meta.name} is already added`);
        return;
    }
    tree.contests.set(target.meta.id, target);
    tree.notebooks.set(target.meta.id, new notebook.Notebook(target.meta.id, target.questions ?? []));
    tree.sync();
}

export function deleteContest(contestId: string): void {
    const contest = tree.contests.get(contestId);
    if (!contest) {
        return;
    }
    tree.contests.delete(contest.meta.id);
    tree.notebooks.delete(contest.meta.id);
    tree.sync();
}