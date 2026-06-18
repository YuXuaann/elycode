import * as fs from 'fs';
import * as path from 'path';
import * as consts from '../consts';
import * as contest from './contest';
import * as meta from './meta';
import { Result, Err, Ok } from "../utils";
import * as vscode from 'vscode';

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
                    vscode.window.showErrorMessage(`Failed to load ${platform} contest: ${error.message}`);
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