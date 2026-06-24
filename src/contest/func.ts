import * as fs from 'fs';
import * as path from 'path';
import * as consts from '../consts';
import * as contest from './contest';
import * as meta from './meta';
import { Result, Err, Ok } from "../utils";
import * as vscode from 'vscode';
import * as jsdom from 'jsdom';

export async function loadFromURL(rawURL: string): Promise<Result<contest.Contest>> {
    const normalized = rawURL.trim();
    const url = normalized.startsWith('http://') || normalized.startsWith('https://')
        ? new URL(normalized)
        : new URL(`https://${normalized}`);

    for (const [hosts, factory] of contest.availableFactories) {
        if (hosts.has(url.hostname)) {
            return await factory(url.pathname);
        }
    }

    return Err(new Error(`No available factories for ${rawURL}`));
}

export function loadFromLocal(): Result<meta.Record> {
    const filePath = path.join(consts.elycodeDir, consts.CONTEST_RECORD);
    if (!fs.existsSync(filePath)) {
        const newRecord = new meta.Record([]);
        saveToLocal(newRecord);
        return Ok(newRecord);
    }

    const record = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as meta.Record;
    if (!record) {
        return Err(new Error(`${filePath} is not in the expected format`));
    }

    const contests: contest.Contest[] = [];
    for (const [platform, transfer] of contest.availableContests) {
        for (const contest of record.contests) {
            if (contest.meta?.platform === platform) {
                const { result, error } = transfer(contest);
                if (error) {
                    vscode.window.showErrorMessage(`Failed to load ${platform} contest: ${error.message}.`);
                }
                contests.push(result!);
            }
        }
    }

    return Ok(new meta.Record(contests));
}

export function saveToLocal(contest: meta.Record) {
    const filePath = path.join(consts.elycodeDir, consts.CONTEST_RECORD);
    fs.mkdirSync(consts.elycodeDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(contest, null, 4), 'utf-8');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getHtmlData(response: Response): Promise<Result<any>> {
    const html = await response.text();
    const dom = new jsdom.JSDOM(html);
    const samples = dom.window.document.querySelectorAll('script#lentille-context');
    if (samples.length === 0) {
        return Err(new Error(`with empty return`));
    }

    const context = JSON.parse(samples[0].textContent ?? '{}');
    return Ok(context?.data);
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getProblem(platform: meta.Platform, contestId: string, id: string): Promise<Result<any>> {
    let responseURL: string;
    switch (platform) {
        case meta.Platform.Codeforces:
            responseURL = `${consts.CONTEST_PROBLEMS_API_BASE}/CF${contestId}${id}`;
            break;
        default:
        case meta.Platform.Luogu:
            responseURL = `${consts.CONTEST_PROBLEMS_API_BASE}/${id}`;
    }
    const response = await fetch(responseURL);
    if (!response.ok) {
        return Err(new Error(`${platform} fetch problems Error with status: ${response.status}`));
    }

    const { result: data, error } = await getHtmlData(response);
    if (error) {
        return Err(new Error(`${platform} fetch problems Error: ${error.message}`));
    }

    return Ok(data?.problem ?? []);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getResultFromProblem(problem: any): { samples: meta.Sample[]; description: string; formatInput: string; formatOutput: string; hint: string; } {
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
