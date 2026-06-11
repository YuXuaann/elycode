import path from 'path';
import * as vscode from 'vscode';

export const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
export const elycodeDir = path.join(root, '.elycode');

export enum commands {
    elycodeHello = 'elycode.hello',
    openWorkspace = 'elycode.openWorkspace',
    openContest = 'elycode.openContest',
    reloadContest = 'elycode.reloadContest',
    sidebarView = 'elycode.sidebarView',
    notebook = 'elycode.notebook',
    codingWindow = 'elycode.codingWindow',
    updateContestName = 'elycode.updateContestName',
}

export const CONTEST_RECORD = '.elycode.json';
export const CONTEST_SAMPLE = '.elynote';
export const CONTEST_PROBLEMS_API_BASE = "https://www.luogu.com.cn/problem";

export const CODEFORCES_HOSTS = new Set<string>([
    'codeforces.com',
    'm1.codeforces.com',
    'm2.codeforces.com',
    'm3.codeforces.com',
]);
export const CODEFORCES_API_BASE = 'https://codeforces.com/api';
export const CODEFORCES_STANDINGS = 'contest.standings';