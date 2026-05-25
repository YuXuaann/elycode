import * as cf from './codeforces';
import * as vscode from 'vscode';
import * as consts from './const';
import * as fs from 'fs';
import * as path from 'path';

// todo: export type ContestPlatform = 'Codeforces' | 'AtCoder' | 'LeetCode' | 'HackerRank' | 'CodeChef' | undefined;
export type ContestPlatform = 'Codeforces' | undefined; // for now, we only support Codeforces

export class Meta {
    createdTime: Date | undefined;
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
        public collapsibleState: vscode.TreeItemCollapsibleState,
        public historyCommit: Commit[],
        icon?: string,
        command?: vscode.Command
    ) {
        super(title, collapsibleState);
        this.contextValue = 'question';
        if (icon) {
            this.iconPath = new vscode.ThemeIcon(icon);
        }
        this.command = command;
    }
}

export class Commit {
    timestamp: Date | undefined;
    code: string | undefined;
    result: string | undefined;
}

export interface Contest {
    meta: Meta;
    questions: Question[];
}

export function setQuestionCommands(contest: Contest, command: (q: Question) => vscode.Command, when?: (q: Question) => boolean) {
    for (const question of contest.questions) {
        if (when && !when(question)) {
            continue;
        }
        question.command = command(question);
    }
}

export async function parse(rawURL: string): Promise<Contest | undefined> {
    const normalized = rawURL.trim();
    const url = normalized.startsWith('http://') || normalized.startsWith('https://')
        ? new URL(normalized)
        : new URL(`https://${normalized}`);

    if (consts.CODEFORCES_HOSTS.has(url.hostname)) {
        return await cf.Codeforces.new(url.pathname);
    }

    return undefined;
}

export function load(savePath: string): Contest | undefined {
    const filePath = path.join(savePath, consts.CONTEST_RECORD);
    if (!fs.existsSync(filePath)) {
        return undefined;
    }

    const recordContent = fs.readFileSync(filePath, 'utf-8');
    const record = JSON.parse(recordContent);

    if (record as cf.Codeforces) {
        return record as cf.Codeforces;
    }

    return undefined;
}

export function save(contest: Contest, savePath: string): void {
    const filePath = path.join(savePath, consts.CONTEST_RECORD);
    fs.mkdirSync(savePath, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(contest, null, 4), 'utf-8');
}