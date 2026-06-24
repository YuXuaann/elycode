import * as meta from './meta';
import * as contest from './contest';
import * as consts from '../consts';
import * as func from './func';
import { Result, Ok, Err } from "../utils";

export class Luogu implements contest.Contest {
    constructor(
        public meta: meta.Meta,
        public questions: meta.Question[]
    ) { }

    static {
        const luoguMeta = new meta.Meta();
        luoguMeta.platform = meta.Platform.Luogu;
        contest.register(consts.LUOGU_HOSTS, new Luogu(luoguMeta, []), (data: unknown) => {
            if (data as Luogu) {
                return Ok(data as Luogu);
            }
            return Err(new Error("It is not Luogu platform"));
        });
    }

    async create(pathname: string): Promise<Result<Luogu>> {
        const luoguMeta = new meta.Meta();

        luoguMeta.createdTime = new Date().toUTCString();
        luoguMeta.platform = meta.Platform.Luogu;
        luoguMeta.startTime = new Date().toUTCString();
        luoguMeta.endTime = new Date().toUTCString();

        pathname.replace(/\/+$|^\/+/, '');
        const segments = pathname.split('/');
        if (!(segments.length >= 2 && segments[1] === 'problem')) {
            return Err(new Error(`Invalid Luogu contest URL: ${pathname}`));
        }
        luoguMeta.id = segments[2]; // luogu's contestId is equal to problemId

        const { result: problem, error } = await func.getProblem(meta.Platform.Luogu, '', luoguMeta.id);
        if (error) {
            return Err(error);
        }
        const { samples, description, formatInput, formatOutput, hint } = func.getResultFromProblem(problem!);
        const title = problem.index && problem.name
            ? `${problem.index}. ${problem.name}`
            : problem.name ?? problem.index ?? 'Unknown Problem';
        luoguMeta.name = title;

        const question = new meta.Question(
            luoguMeta.id,
            title,
            description,
            meta.QuestionType.normal,
            samples,
            new meta.Statistics(),
            formatInput,
            formatOutput,
            hint
        );
        question.statistics.points = problem.points ? `${problem.points} pts` : undefined;

        return Ok(new Luogu(luoguMeta, [question]));
    }

    async getSubmissions(username: string): Promise<Result<meta.Commit[]>> {
        const { result: uid, error: getUidError } = await getUid(username);
        if (getUidError) {
            return Err(getUidError);
        }

        const ret = await fetch(`${consts.LUOGU_API_BASE}/${consts.LUOGU_USERSTATUS.replace(':uid', uid!)}`);
        if (!ret.ok) {
            return Err(new Error(`Luogu getSubmissions error: ${ret.status} ${ret.statusText}`));
        }

        const { result: data, error: getHtmlDataError } = await func.getHtmlData(ret);
        if (getHtmlDataError) {
            return Err(getHtmlDataError);
        }

        const commits = [];
        if (Array.isArray(data.passed)) {
            for (const passed of data.passed) {
                const { pid } = passed;

                const commit = new meta.Commit();
                commit.verdict = 'Accept';
                if (pid) {
                    commit.contestId = String(pid);
                    commit.questionId = String(pid);

                    const params = new URLSearchParams({ pid: pid, user: username, page: '1' });
                    commit.code = `https://www.luogu.com.cn/record/list?${params.toString()}`;
                    console.log(commit.code);
                }
                commits.push(commit);
            }
        }

        return Ok(commits);
    }

    getSubmitURL(contestId: string): string {
        return `https://www.luogu.com.cn/problem/${contestId}#submit`;
    }
}


async function getUid(username: string): Promise<Result<string>> {
    const params = new URLSearchParams({ keyword: username });
    const ret = await fetch(`${consts.LUOGU_API_BASE}/${consts.LUOGU_GETUSER}?${params.toString()}`);
    if (!ret.ok) {
        return Err(new Error(`Luogu getSubmissions error: ${ret.status} ${ret.statusText}`));
    }
    const json = await ret.json();
    if (Array.isArray(json.users)) {
        const { uid } = json.users[0];
        if (!uid) {
            return Err(new Error(`Get luogu uid failed.`));
        }
        return Ok(uid);
    }
    return Err(new Error(`Get luogu uid failed.`));
}