import * as vscode from 'vscode';
import * as contest from './contest';
import * as consts from './const';

export class Codeforces implements contest.Contest {
    constructor(
        public meta: contest.Meta,
        public questions: contest.Question[]
    ) { }

    static async new(pathname: string): Promise<Codeforces> {
        const meta = new contest.Meta();
        const questions: contest.Question[] = [];

        meta.platform = 'Codeforces';

        pathname.replace(/\/+$|^\/+/, '');
        const segments = pathname.split('/');
        if (!(segments.length >= 2 && segments[1] === 'contest')) {
            throw new Error(`Invalid Codeforces contest URL: ${pathname}`);
        }
        meta.id = segments[2];

        const params = new URLSearchParams({ contestId: meta.id });
        const ret = await fetch(`${consts.CODEFORCES_API_BASE}/${consts.CODEFORCES_STANDINGS}?${params.toString()}`);
        const json = await ret.json();
        console.log(json);
        if (json.status === 'OK') {
            const { contest: contestInfo, problems } = json.result;
            if (contestInfo) {
                meta.name = contestInfo.name;
                meta.startTime = new Date(contestInfo.startTimeSeconds * 1000);
                meta.endTime = new Date((contestInfo.startTimeSeconds + contestInfo.durationSeconds) * 1000);
            }

            if (Array.isArray(problems)) {
                for (const problem of problems) {
                    const title = problem.index && problem.name
                        ? `${problem.index}. ${problem.name}`
                        : problem.name ?? problem.index ?? 'Unknown Problem';
                    const question = new contest.Question(
                        String(problems.indexOf(problem)),
                        title,
                        [],
                        vscode.TreeItemCollapsibleState.Collapsed,
                        [],
                    );
                    question.description = problem.points ? `${problem.points} pts` : undefined;
                    question.tooltip = problem.tags?.length ? `${problem.tags.join(', ')}` : undefined;
                    questions.push(question);
                }
            }
        }

        return new Codeforces(meta, questions);
    }
}