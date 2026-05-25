import * as vscode from 'vscode';
import * as contest from './contest';
import * as consts from './const';
import { JSDOM } from 'jsdom';

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

export async function getProblems(contestId: string, id: string): Promise<contest.Example[] | undefined> {
    const response = await fetch(`${consts.CONTEST_PROBLEMS_API_BASE}/CF${contestId}${id}`);
    if (!response.ok) {
        vscode.window.showErrorMessage(`Failed to fetch problem page for ${id}`);
        return undefined;
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const samples = dom.window.document.querySelectorAll('script#lentille-context');
    if (samples.length === 0) {
        return undefined;
    }

    try {
        const context = JSON.parse(samples[0].textContent ?? '{}');
        const problemSamples: string[][] = context?.data?.problem?.samples ?? [];
        return problemSamples.map((sample: string[]) => {
            const [input = '', output = ''] = sample;
            return { input, output };
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to parse samples for ${id}: ${message}`);
        return undefined;
    }
}