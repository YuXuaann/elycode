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

        meta.createdTime = new Date();
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
                const examples = await getProblemsWithName(meta.id, questionId, problem.name ?? '') ?? [];
                const question = new contest.Question(
                    questionId,
                    title,
                    examples,
                    vscode.TreeItemCollapsibleState.None,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getProblems(contestId: string, id: string): Promise<any | undefined> {
    const response = await fetch(`${consts.CONTEST_PROBLEMS_API_BASE}/CF${contestId}${id}`);
    if (!response.ok) {
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
        return context?.data?.problem ?? [];
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to parse samples for ${id}: ${message}`);
        return undefined;
    }
}

export async function getProblemsWithName(contestId: string, id: string, name: string): Promise<contest.Example[] | undefined> {
    const numericContestId = Number(contestId);
    if (Number.isNaN(numericContestId)) {
        throw new Error(`Invalid contestID ${contestId}`);
    }

    const problem = await getProblems(contestId, id);
    if (problem || name === '') {
        const problemSamples: string[][] = problem.samples ?? [];
        return problemSamples.map((sample: string[]) => {
            const [input = '', output = ''] = sample;
            return { input, output };
        });
    }
    console.warn(`Problem ${id} not found in contest ${contestId}, trying adjacent contests...`);

    for (const delta of [-1, 1]) {
        const contestId = String(numericContestId + delta);
        const params = new URLSearchParams({ contestId: contestId });
        const ret = await fetch(`${consts.CODEFORCES_API_BASE}/${consts.CODEFORCES_STANDINGS}?${params.toString()}`);
        const json = await ret.json();
        if (json.status !== 'OK') {
            continue;
        }

        const { problems } = json.result;
        if (!Array.isArray(problems)) {
            continue;
        }

        for (const problem of problems) {
            if (!problem.index || !problem.name) {
                continue;
            }
            const luoguProblem = await getProblems(contestId, problem.index);

            if (name === luoguProblem.name) {
                const problemSamples: string[][] = luoguProblem.samples ?? [];
                return problemSamples.map((sample: string[]) => {
                    const [input = '', output = ''] = sample;
                    return { input, output };
                });
            }
        }
    }

    return undefined;
}