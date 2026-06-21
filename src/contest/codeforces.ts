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
        cfMeta.platform = meta.Platform.Codeforces;
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

        cfMeta.createdTime = new Date().toUTCString();
        cfMeta.platform = meta.Platform.Codeforces;

        pathname.replace(/\/+$|^\/+/, '');
        const segments = pathname.split('/');
        if (!(segments.length >= 2 && segments[1] === 'contest')) {
            return Err(new Error(`Invalid Codeforces contest URL: ${pathname}`));
        }
        cfMeta.id = segments[2];

        const params = new URLSearchParams({ contestId: cfMeta.id });
        const ret = await fetch(`${consts.CODEFORCES_API_BASE}/${consts.CODEFORCES_STANDINGS}?${params.toString()}`);
        if (!ret.ok) {
            return Err(new Error(`Codeforces getSubmissions error: ${ret.status} ${ret.statusText}`));
        }
        const json = await ret.json();
        if (json.status !== 'OK') {
            return Err(new Error(`Codeforces fetch Error with status: ${json.status}`));
        }

        const { contest: contestInfo, problems } = json.result;
        if (contestInfo) {
            cfMeta.name = contestInfo.name;
            cfMeta.startTime = new Date(contestInfo.startTimeSeconds * 1000).toUTCString();
            cfMeta.endTime = new Date((contestInfo.startTimeSeconds + contestInfo.durationSeconds) * 1000).toUTCString();
        }

        if (Array.isArray(problems)) {
            for (const problem of problems) {
                const questionId = problem.index ? problem.index : String(problems.indexOf(problem));
                const title = problem.index && problem.name
                    ? `${problem.index}. ${problem.name}`
                    : problem.name ?? problem.index ?? 'Unknown Problem';
                const { result, error } = await fetchProblemWithName(cfMeta.id, questionId, problem.name ?? '');
                if (error) {
                    console.warn(error);
                }
                const { samples, description, formatInput, formatOutput, hint } = getResultFromProblem(result);
                const question = new meta.Question(
                    questionId,
                    title,
                    description,
                    'normal',
                    samples,
                    new meta.Statistics(),
                    formatInput,
                    formatOutput,
                    hint
                );
                question.statistics.points = problem.points ? `${problem.points} pts` : undefined;
                questions.push(question);
            }
        }

        return Ok(new Codeforces(cfMeta, questions));
    }

    async getSubmissions(username: string): Promise<Result<meta.Commit[]>> {
        const params = new URLSearchParams({ handle: username, from: "1", count: "10" });
        const ret = await fetch(`${consts.CODEFORCES_API_BASE}/${consts.CODEFORCES_USERSTATUS}?${params.toString()}`);
        if (!ret.ok) {
            return Err(new Error(`Codeforces getSubmissions error: ${ret.status} ${ret.statusText}`));
        }
        const json = await ret.json();
        const commits = [];

        if (Array.isArray(json.result)) {
            for (const result of json.result) {
                const { id: submissionId, contestId, creationTimeSeconds, problem, verdict, passedTestCount, timeConsumedMillis, memoryConsumedBytes } = result;
                const { index: questionId } = problem;

                const commit = new meta.Commit();
                if (creationTimeSeconds) {
                    commit.timestamp = new Date(creationTimeSeconds).toUTCString();
                }
                if (verdict) {
                    commit.verdict = verdict;
                }
                if (contestId) {
                    commit.contestId = String(contestId);
                }
                if (questionId) {
                    commit.questionId = questionId;
                }
                if (submissionId && contestId) {
                    commit.code = `https://codeforces.com/contest/${contestId}/submission/${submissionId}`;
                }
                if (passedTestCount) {
                    commit.passedTestCount = passedTestCount;
                }
                if (timeConsumedMillis) {
                    commit.timeConsumedMillis = timeConsumedMillis;
                }
                if (memoryConsumedBytes) {
                    commit.memoryConsumedBytes = memoryConsumedBytes;
                }
                commits.push(commit);
            }
        }

        return Ok(commits);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getResultFromProblem(problem: any): { samples: meta.Sample[]; description: string; formatInput: string; formatOutput: string; hint: string; } {
    const problemSamples: string[][] = problem!.samples ?? [];
    const description: string = problem!.content?.description ?? '';
    const formatInput: string = problem!.content?.formatI ?? '';
    const formatOutput: string = problem!.content?.formatO ?? '';
    const hint: string = problem!.content?.hint ?? '';
    const samples = problemSamples.map((sample: string[]) => {
        const [input = '', output = ''] = sample;
        return new meta.Sample(input, output);
    });
    return { samples, description, formatInput, formatOutput, hint };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchProblemWithName(contestId: string, id: string, name: string): Promise<Result<any>> {
    const numericContestId = Number(contestId);
    if (Number.isNaN(numericContestId)) {
        return Err(new Error(`Codeforces fetch problems Error with Invalid contestID: ${contestId}`));
    }

    const { result: problem, error } = await getProblems(contestId, id);
    if (!error || name === '') {
        return Ok(problem);
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
                return Ok(luoguProblem);
            }
        }
    }

    return Err(new Error(`Problem ${id} not found in contest ${contestId}`));
}