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
        if (json.status !== 'OK') {
            return new Codeforces(meta, questions);
        }

        const { contest: contestInfo, problems } = json.result;
        if (contestInfo) {
            meta.name = contestInfo.name;
            meta.startTime = new Date(contestInfo.startTimeSeconds * 1000);
            meta.endTime = new Date((contestInfo.startTimeSeconds + contestInfo.durationSeconds) * 1000);
        }

        if (Array.isArray(problems)) {
            for (const problem of problems) {
                const questionId = problem.index ? problem.index : String(problems.indexOf(problem));
                const title = problem.index && problem.name
                    ? `${problem.index}. ${problem.name}`
                    : problem.name ?? problem.index ?? 'Unknown Problem';
                const examples = await getProblems(meta.id, questionId) ?? [];
                console.log(`examples for problem ${questionId}:`, examples);
                const question = new contest.Question(
                    questionId,
                    title,
                    examples,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    [],
                );
                question.description = problem.points ? `${problem.points} pts` : undefined;
                question.tooltip = problem.tags?.length ? `${problem.tags.join(', ')}` : undefined;
                questions.push(question);
            }
        }

        return new Codeforces(meta, questions);
    }
}

async function getProblems(contestId: string, id: string): Promise<contest.Example[] | undefined> {
    const response = await fetch(`https://codeforces.com/contest/${contestId}/problem/${id}?locale=en`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': `https://codeforces.com/contest/${contestId}`,
            'Cache-Control': 'no-cache',
        },
    });
    if (!response.ok) {
        vscode.window.showErrorMessage(`Failed to fetch problem page for ${id}`);
        return undefined;
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const sampleTests = doc.querySelectorAll('.sample-test');
    const examples: contest.Example[] = [];
    sampleTests.forEach((sample) => {
        const input = sample.querySelector('.input pre');
        const output = sample.querySelector('.output pre');
        examples.push({
            input: input?.textContent ?? undefined,
            output: output?.textContent ?? undefined,
        });
    });

    return examples;
}