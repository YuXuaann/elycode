import * as vscode from 'vscode';
import * as meta from '../contest/meta';

export enum ItemType {
    AddContest = 'AddContest',
    Contest = 'Contest',
    Question = 'Question',
    Statistics = 'Statistics',
    ErrorMessage = 'errorMessage'
}

export class Item {
    constructor(
        public readonly type: ItemType,
        public contestId?: string,
        public questionId?: string,
        public commit?: meta.Commit,
    ) {
        if (type === ItemType.Question && !questionId) {
            throw new Error('Question item must have a questionId');
        }
        if (type === ItemType.Contest && !contestId) {
            throw new Error('Contest item must have a contestId');
        }
    }

    static AddContest = new Item(ItemType.AddContest);
    static ErrorMessage = new Item(ItemType.ErrorMessage);
}

export class TreeItem extends vscode.TreeItem {
    constructor(
        public readonly contextValue: string,
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly icon?: string,
        public readonly description?: string,
        command?: vscode.Command,
    ) {
        super(label, collapsibleState);
        this.iconPath = icon ? new vscode.ThemeIcon(icon) : undefined;
        this.description = description;
        this.contextValue = contextValue;
        if (command) {
            this.command = command;
        }
    }
}