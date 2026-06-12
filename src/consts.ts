import path from 'path';
import * as vscode from 'vscode';

export const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
export const elycodeDir = path.join(root, '.elycode');

export enum configs {
    compilerPath = 'compilerPath',
    compileExtraParams = 'compileExtraParams',
    temporaryPath = 'temporaryPath',
    runningTimeLimit = 'runningTimeLimit',
    runningMemoryLimit = 'runningMemoryLimit',
    templateMode = 'templateMode',
    customTemplate = 'customTemplate',
}

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

export const AUTO_TEMPLATE = `#include<bits/stdc++.h>
typedef long long ll;

const int N = 2e5 + 5;

void solve() {

}

signed main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(false);
    std::cout.tie(false);

    int T = 1;
    cin >> T;
    while(T--) {
        solve();
    }

    return 0;
}
`;

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

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Result<T> = { result?: T, error?: Error };
export function Ok<T>(result: T): Result<T> { return { result }; }
export function Err<T>(error: Error): Result<T> { return { error }; }
