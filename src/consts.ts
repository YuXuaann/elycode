import path from 'path';
import * as vscode from 'vscode';

export const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
export const elycodeDir = path.join(root, '.elycode');
export const extensionDir = vscode.extensions.getExtension('yuxuaan.elycode')?.extensionUri.fsPath ?? '';

export enum configs {
    compilerDetectMode = 'compiler.detectMode',
    compilerCustomPath = 'compiler.customPath',
    compileExtraParams = 'compiler.extraParams',
    runningTimeLimit = 'running.timeLimit(seconds)',
    runningMemoryLimit = 'running.memoryLimit(MB)',
    temporaryPath = 'running.temporaryPath',
    templateMode = 'code.templateMode',
    customTemplate = 'code.customTemplate',
    codeforcesUserName = 'platform.codeforces.UserName',
    updateContestInfoIntervalSecond = 'platform.updateContestInfoInterval(seconds)'
}

export enum commands {
    elycodeHello = 'elycode.hello',
    openWorkspace = 'elycode.openWorkspace',
    refresh = 'elycode.refresh',
    addContest = 'elycode.addContest',
    deleteContest = 'elycode.deleteContest',
    sidebarView = 'elycode.sidebarView',
    notebook = 'elycode.notebook',
    codingWindow = 'elycode.codingWindow',
    updateContestName = 'elycode.updateContestName',
    openURL = 'elycode.openURL',
    openSubmitPage = 'elycode.openSubmitPage',
}

export const AUTO_CODE_TEMPLATE = `#include<bits/stdc++.h>
typedef long long ll;

const int N = 2e5 + 5;

void solve() {

}

signed main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    std::cout.tie(nullptr);

    int T = 1;
    std::cin >> T;
    while(T--) {
        solve();
    }

    return 0;
}
`;

export const CONTEST_RECORD = '.elycode.json';
export const QUESTION_NOTE = '.elynote';
export const CONTEST_PROBLEMS_API_BASE = "https://www.luogu.com.cn/problem";

export const CODEFORCES_HOSTS = new Set<string>([
    'codeforces.com',
    'm1.codeforces.com',
    'm2.codeforces.com',
    'm3.codeforces.com',
]);
export const CODEFORCES_API_BASE = 'https://codeforces.com/api';
export const CODEFORCES_STANDINGS = 'contest.standings';
export const CODEFORCES_USERSTATUS = 'user.status';

export const GCC_DIRECTORIES_BY_PLATFORM: Record<NodeJS.Platform, string[]> = {
    aix: [],
    android: [],
    cygwin: ['C:/cygwin64/bin'],
    darwin: ['/usr/bin', '/usr/local/bin', '/opt/homebrew/bin', '/opt/local/bin'],
    freebsd: ['/usr/bin', '/usr/local/bin'],
    haiku: [],
    linux: ['/usr/bin', '/usr/local/bin', '/bin', '/usr/sbin'],
    netbsd: ['/usr/bin', '/usr/local/bin'],
    openbsd: ['/usr/bin', '/usr/local/bin'],
    sunos: ['/usr/bin', '/usr/local/bin'],
    win32: [
        'C:/msys64/usr/bin',
        'C:/mingw64/bin',
        'C:/Program Files/mingw-w64/bin',
        'C:/Program Files (x86)/mingw-w64/bin'
    ]
};

export const AUTO_GCC_DIRECTORIE_BY_PLATFORM: Record<NodeJS.Platform, string> = {
    aix: '',
    android: '',
    cygwin: '',
    darwin: '',
    freebsd: '',
    haiku: '',
    linux: '',
    netbsd: '',
    openbsd: '',
    sunos: '',
    win32: 'elycode-gcc-win64-16.1.0'
};

export const AUTO_GCC_DOWNLOAD_URL_BY_PLATFORM: Record<NodeJS.Platform, string> = {
    aix: '',
    android: '',
    cygwin: '',
    darwin: '',
    freebsd: '',
    haiku: '',
    linux: '',
    netbsd: '',
    openbsd: '',
    sunos: '',
    win32: 'https://zenlayer.dl.sourceforge.net/project/gcc-win64/16.1.0/gcc-16.1.0-gdb-17.2.90.20260510-binutils-2.46.0-mingw-w64-v14.0.0-ucrt.7z?viasf=1&fid=1c961fed6b66bd6f'
};

export const GCC_EXECUTABLE_NAMES: Record<NodeJS.Platform, string[]> = {
    win32: ['gcc.exe', 'x86_64-w64-mingw32-gcc.exe'],
    aix: ['gcc'],
    android: ['gcc'],
    cygwin: ['gcc'],
    darwin: ['gcc', 'gcc-13', 'gcc-12', 'gcc-11', 'cc'],
    freebsd: ['gcc', 'gcc-13', 'gcc-12', 'gcc-11', 'cc'],
    haiku: ['gcc'],
    linux: ['gcc', 'gcc-13', 'gcc-12', 'gcc-11', 'cc'],
    netbsd: ['gcc', 'cc'],
    openbsd: ['gcc', 'cc'],
    sunos: ['gcc', 'cc']
};

export const GCC_EXTRA_PARAMS = ['-pipe', '-static', '-s', '-lstdc++', '-lm'];