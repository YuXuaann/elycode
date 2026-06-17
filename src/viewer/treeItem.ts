import * as vscode from 'vscode';

export enum ItemType {
    AddContest = 'AddContest',
    Contest = 'Contest',
    Question = 'Question',
    ErrorMessage = 'errorMessage'
}

export class Item {
    constructor(
        public readonly type: ItemType,
        public questionId?: string,
        public contestId?: string
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
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly icon?: string,
        public readonly description?: string,
        command?: vscode.Command,
    ) {
        super(label, collapsibleState);
        if (command) {
            this.command = command;
        }
        this.iconPath = icon ? new vscode.ThemeIcon(icon) : undefined;
        this.description = description;
    }
}