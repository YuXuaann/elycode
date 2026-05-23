import * as contest from './contest';
import * as consts from './const';
import * as vscode from 'vscode';

async function getContestName(id: string): Promise<string | undefined> {
    const res = await fetch(consts.CODEFORCES_API_BASE + '/' + consts.CODEFORCES_LIST);
    const json = await res.json();
    console.log(json);
    if (json.status !== 'OK') {
        return undefined;
    }
    const found = json.result.find((c: { id: number | string }) => String(c.id) === id);
    return found?.name;
}

export class Codeforces implements contest.Contest {
    meta: contest.Meta;
    questions: contest.Question[] = [
        new contest.Question('id1', 'Question 1', [
            { input: 'Example input 1', output: 'Example output 1' },
            { input: 'Example input 2', output: 'Example output 2' },
        ], vscode.TreeItemCollapsibleState.Collapsed, []),
        new contest.Question('id2', 'Question 2', [
            { input: 'Example input A', output: 'Example output A' },
            { input: 'Example input B', output: 'Example output B' },
        ], vscode.TreeItemCollapsibleState.Collapsed, []),
    ];

    constructor(meta: contest.Meta) {
        this.meta = meta;
    }

    static async new(pathname: string): Promise<Codeforces> {
        const meta = new contest.Meta();
        pathname.replace(/\/+$|^\/+/, '');
        const segments = pathname.split('/');

        meta.platform = 'Codeforces';

        if (segments.length >= 2 && segments[1] === 'contest') {
            meta.id = segments[2];
        } else {
            throw new Error(`Invalid Codeforces contest URL: ${pathname}`);
        }

        meta.name = await getContestName(meta.id ?? '');
        return new Codeforces(meta);
    }
}