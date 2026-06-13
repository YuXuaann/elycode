import * as meta from './meta';
import * as contest from './contest';
import * as consts from '../consts';
import * as jsdom from 'jsdom';
import { Result, Ok, Err } from "../utils";

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
                return Ok(data as Codeforces);
            }
            return Err(new Error("It is not codeforces platform"));
        });
    }

    async create(pathname: string): Promise<Result<Codeforces>> {
        const cfMeta = new meta.Meta();
        const questions: meta.Question[] = [];

        cfMeta.createdTime = new Date();
        cfMeta.platform = 'Codeforces';

        pathname.replace(/\/+$|^\/+/, '');
        const segments = pathname.split('/');
        if (!(segments.length >= 2 && segments[1] === 'contest')) {
            return Err(new Error(`Invalid Codeforces contest URL: ${pathname}`));
        }
        cfMeta.id = segments[2];

        const params = new URLSearchParams({ contestId: cfMeta.id });
        const ret = await fetch(`${consts.CODEFORCES_API_BASE}/${consts.CODEFORCES_STANDINGS}?${params.toString()}`);
        const json = await ret.json();
        if (json.status !== 'OK') {
            return Err(new Error(`Codeforces fetch Error with status: ${json.status}`));
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
                const { result, error } = await getProblemsWithName(cfMeta.id, questionId, problem.name ?? '');
                if (error) {
                    console.warn(error);
                }
                const examples = result ?? [];
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

        return Ok(new Codeforces(cfMeta, questions));
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getProblems(contestId: string, id: string): Promise<Result<any>> {
    console.log(`[getProblems] contestId: ${contestId}, id: ${id}`);
    const response = await fetch(`${consts.CONTEST_PROBLEMS_API_BASE}/CF${contestId}${id}`);
    if (!response.ok) {
        return Err(new Error(`Codeforces fetch problems Error with status: ${response.status}`));
    }

    const html = await response.text();
    const dom = new jsdom.JSDOM(html);
    const samples = dom.window.document.querySelectorAll('script#lentille-context');
    if (samples.length === 0) {
        return Err(new Error(`Codeforces fetch problems Error with empty return`));
    }

    const context = JSON.parse(samples[0].textContent ?? '{}');
    return Ok(context?.data?.problem ?? []);
}

export async function getProblemsWithName(contestId: string, id: string, name: string): Promise<Result<meta.Sample[]>> {
    const numericContestId = Number(contestId);
    if (Number.isNaN(numericContestId)) {
        return Err(new Error(`Codeforces fetch problems Error with Invalid contestID: ${contestId}`));
    }

    const { result: problem, error } = await getProblems(contestId, id);
    if (!error || name === '') {
        const problemSamples: string[][] = problem!.samples ?? [];
        const res = problemSamples.map((sample: string[]) => {
            const [input = '', output = ''] = sample;
            return { input, output };
        });
        return Ok(res);
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
            const { result: luoguProblem, error } = await getProblems(contestId, problem.index);
            if (error) {
                continue;
            }

            if (name === luoguProblem.name) {
                const problemSamples: string[][] = luoguProblem.samples ?? [];
                const res = problemSamples.map((sample: string[]) => {
                    const [input = '', output = ''] = sample;
                    return { input, output };
                });
                return Ok(res);
            }
        }
    }

    return Err(new Error(`Problem ${id} not found in contest ${contestId}`));
}