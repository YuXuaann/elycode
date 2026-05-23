import * as contest from './contest';
import * as vscode from 'vscode';

export const CODEFORCES_HOSTS = new Set<string>([
    'codeforces.com',
    'm1.codeforces.com',
    'm2.codeforces.com',
    'm3.codeforces.com',
]);

async function getContestName(id: string): Promise<string | undefined> {
    const res = await fetch('https://codeforces.com/api/contest.list');
    const json = await res.json();
    console.log(json);
    if (json.status !== 'OK') {
        return undefined;
    }
    const found = json.result.find((c: { id: number | string }) => String(c.id) === id);
    return found?.name;
}

export class CodeforcesContest implements contest.Contest {
    private contestMeta: contest.Meta;

    private constructor(meta: contest.Meta) {
        this.contestMeta = meta;
    }

    static async new(pathname: string): Promise<CodeforcesContest> {
        const meta = new contest.Meta();
        pathname.replace(/\/+$|^\/+/, '');
        const segments = pathname.split('/');

        meta.platform = 'Codeforces';

        if (segments.length >= 2 && segments[0] === 'contest') {
            meta.id = segments[1];
        } else {
            throw new Error(`Invalid Codeforces contest URL: ${pathname}`);
        }

        meta.name = await getContestName(meta.id ?? '');
        return new CodeforcesContest(meta);
    }

    meta(): contest.Meta {
        return this.contestMeta;
    }

    questions(): contest.Question[] {
        return [
            new contest.Question('id1', 'Question 1', [
                { input: 'Example input 1', output: 'Example output 1' },
                { input: 'Example input 2', output: 'Example output 2' },
            ], vscode.TreeItemCollapsibleState.Collapsed),
            new contest.Question('id2', 'Question 2', [
                { input: 'Example input A', output: 'Example output A' },
                { input: 'Example input B', output: 'Example output B' },
            ], vscode.TreeItemCollapsibleState.Collapsed),
        ];
    }
}