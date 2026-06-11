import * as meta from './meta';
import * as contest from './contest';
import * as consts from '../consts';
import { JSDOM } from 'jsdom';

export class Codeforces implements contest.Contest {
    constructor(
        public meta: meta.Meta,
        public questions: meta.Question[]
    ) { }

    static {
        const cfMeta = new meta.Meta();
        cfMeta.platform = 'Codeforces';
        contest.register(consts.CODEFORCES_HOSTS, new Codeforces(cfMeta, []), (data: unknown) => {
            if (data as Codeforces) {
                return data as Codeforces;
            }
            return undefined;
        });
    }

    async create(pathname: string): Promise<Codeforces> {
        const cfMeta = new meta.Meta();
        const questions: meta.Question[] = [];

        cfMeta.createdTime = new Date();
        cfMeta.platform = 'Codeforces';

        pathname.replace(/\/+$|^\/+/, '');
        const segments = pathname.split('/');
        if (!(segments.length >= 2 && segments[1] === 'contest')) {
            throw new Error(`Invalid Codeforces contest URL: ${pathname}`);
        }
        cfMeta.id = segments[2];

        const params = new URLSearchParams({ contestId: cfMeta.id });
        const ret = await fetch(`${consts.CODEFORCES_API_BASE}/${consts.CODEFORCES_STANDINGS}?${params.toString()}`);
        const json = await ret.json();
        if (json.status !== 'OK') {
            return new Codeforces(cfMeta, questions);
        }

        const { contest: contestInfo, problems } = json.result;
        if (contestInfo) {
            cfMeta.name = contestInfo.name;
            cfMeta.startTime = new Date(contestInfo.startTimeSeconds * 1000);
            cfMeta.endTime = new Date((contestInfo.startTimeSeconds + contestInfo.durationSeconds) * 1000);
        }

        if (Array.isArray(problems)) {
            for (const problem of problems) {
                const questionId = problem.index ? problem.index : String(problems.indexOf(problem));
                const title = problem.index && problem.name
                    ? `${problem.index}. ${problem.name}`
                    : problem.name ?? problem.index ?? 'Unknown Problem';
                const examples = await getProblemsWithName(cfMeta.id, questionId, problem.name ?? '') ?? [];
                const question = new meta.Question(
                    questionId,
                    title,
                    'normal',
                    examples,
                    new meta.Statics(),
                );
                question.statics.points = problem.points ? `${problem.points} pts` : undefined;
                questions.push(question);
            }
        }

        return new Codeforces(cfMeta, questions);
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

    const context = JSON.parse(samples[0].textContent ?? '{}');
    return context?.data?.problem ?? [];
}

export async function getProblemsWithName(contestId: string, id: string, name: string): Promise<meta.Sample[] | undefined> {
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