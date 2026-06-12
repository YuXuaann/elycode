import * as fs from 'fs';
import * as path from 'path';
import * as consts from '../consts';
import * as contest from './contest';
import { Result, Err } from "../consts";

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

export function loadFromLocal(): Result<contest.Contest> {
    const filePath = path.join(consts.elycodeDir, consts.CONTEST_RECORD);
    if (!fs.existsSync(filePath)) {
        return Err(new Error(`${filePath} doesn't exist`));
    }

    const record = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    for (const [platform, transfer] of contest.availableContests) {
        if (record?.meta?.platform === platform) {
            return transfer(record);
        }
    }

    return Err(new Error(`No available platform for ${record?.meta?.platform ?? 'unknown platform'}`));
}

export function saveToLocal(contest: contest.Contest) {
    const filePath = path.join(consts.elycodeDir, consts.CONTEST_RECORD);
    fs.mkdirSync(consts.elycodeDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(contest, null, 4), 'utf-8');
}