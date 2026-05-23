import * as cf from './codeforces';
import * as vscode from 'vscode';

// todo: export type ContestPlatform = 'Codeforces' | 'AtCoder' | 'LeetCode' | 'HackerRank' | 'CodeChef' | undefined;
export type ContestPlatform = 'Codeforces' | undefined; // for now, we only support Codeforces

export class Meta {
    platform: ContestPlatform;
    id: string | undefined;  // unique identifier for the contest, e.g., "cf-2231" = "Codeforces Round 1099 (Div. 2)"
    name: string | undefined; // human-readable name of the contest
    startTime: Date | undefined;
    endTime: Date | undefined;
}

export class Example {
    input: string | undefined;
    output: string | undefined;
}

export class Question extends vscode.TreeItem {
    constructor(
        public id: string,
        public title: string,
        public examples: Example[],
        public collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(title, collapsibleState);
        this.id = id;
        this.title = title;
        this.examples = examples;
        this.contextValue = 'question';
    }
}

export interface Contest {
    meta(): Meta;
    questions(): Question[];
}

export async function parse(rawURL: string): Promise<Contest | undefined> {
    const normalized = rawURL.trim();
    const url = normalized.startsWith('http://') || normalized.startsWith('https://')
        ? new URL(normalized)
        : new URL(`https://${normalized}`);

    if (cf.CODEFORCES_HOSTS.has(url.hostname)) {
        return await cf.CodeforcesContest.new(url.pathname);
    }

    return undefined;
}