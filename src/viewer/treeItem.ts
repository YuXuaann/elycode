import * as vscode from 'vscode';
import * as contest from '../contest/contest';

export enum ItemType {
    EmptyContest = 'EmptyContest',
    Contest = 'Contest',
    Question = 'Question',
}

export class Item {
    constructor(
        public readonly type: ItemType,
        public readonly question?: contest.Question
    ) {
        if (type === ItemType.Question && !question) {
            throw new Error('Question item must have a question');
        }
    }

    static EmptyContest = new Item(ItemType.EmptyContest);
    static Contest = new Item(ItemType.Contest);
}

export class TreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly icon?: string,
        public readonly description?: string,
        public readonly command?: vscode.Command,
    ) {
        super(label, collapsibleState);
        this.iconPath = icon ? new vscode.ThemeIcon(icon) : undefined;
        this.command = command;
        this.description = description;
    }
}