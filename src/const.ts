import * as vscode from 'vscode';

export const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';

// command
export const CMD_OPEN_WORKSPACE = 'elycode.openWorkspace';
export const CMD_OPEN_CONTEST = 'elycode.openContest';
export const CMD_RELOAD_CONTEST = 'elycode.reloadContest';
export const CMD_HELLO = 'elycode.hello';
export const CMD_SIDEBAR_VIEW = 'elycode.sidebarView';

// contest
export const CONTEST_RECORD = 'elycode.json';

export const CODEFORCES_HOSTS = new Set<string>([
    'codeforces.com',
    'm1.codeforces.com',
    'm2.codeforces.com',
    'm3.codeforces.com',
]);
export const CODEFORCES_API_BASE = 'https://codeforces.com/api';
export const CODEFORCES_STANDINGS = 'contest.standings';