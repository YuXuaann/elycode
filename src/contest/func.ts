import * as fs from 'fs';
import * as path from 'path';
import * as consts from '../consts';
import * as contest from './contest';

export async function loadFromURL(rawURL: string): Promise<contest.Contest | undefined> {
    const normalized = rawURL.trim();
    const url = normalized.startsWith('http://') || normalized.startsWith('https://')
        ? new URL(normalized)
        : new URL(`https://${normalized}`);

    for (const [hosts, factory] of contest.availableFactories) {
        if (hosts.has(url.hostname)) {
            return await factory(url.pathname);
        }
    }

    return undefined;
}

export function loadFromLocal(): contest.Contest | undefined {
    const filePath = path.join(consts.elycodeDir, consts.CONTEST_RECORD);
    if (!fs.existsSync(filePath)) {
        return undefined;
    }

    const record = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    for (const [platform, transfer] of contest.availableContests) {
        if (record?.meta?.platform === platform) {
            return transfer(record);
        }
    }
    return undefined;
}

export function saveToLocal(contest: contest.Contest): void {
    const filePath = path.join(consts.elycodeDir, consts.CONTEST_RECORD);
    fs.mkdirSync(consts.elycodeDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(contest, null, 4), 'utf-8');
}