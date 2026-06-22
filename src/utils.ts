import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as cp from 'child_process';
import * as consts from './consts';
import * as configs from './configs';
import * as vscode from 'vscode';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Result<T> = { result?: T, error?: Error };
export function Ok<T>(result: T): Result<T> { return { result }; }
export function Err<T>(error: Error): Result<T> { return { error }; }

export function WrongAnswer<T>(error: Error): Result<T> { return Err(new Error(`WrongAnswer: ${error.message}`)); }
export function TimeLimitExceeded<T>(error: Error): Result<T> { return Err(new Error(`TimeLimitExceeded: ${error.message}`)); }
export function MemoryLimitExceeded<T>(error: Error): Result<T> { return Err(new Error(`MemoryLimitExceeded: ${error.message}`)); } // todo: support MLE
export function CompileError<T>(error: Error): Result<T> { return Err(new Error(`CompileError: ${error.message}`)); }
export function RunError<T>(error: Error): Result<T> { return Err(new Error(`RunError: ${error.message}`)); }

const output = vscode.window.createOutputChannel('elycode');
export function vsPrint(message: string) {
    output.appendLine(message);
    output.show(true);
}

export function detectGccExecutable(): Result<string> {
    const platform = os.platform();
    const directories = consts.GCC_DIRECTORIES_BY_PLATFORM[platform] ?? [];
    const executableNames = consts.GCC_EXECUTABLE_NAMES[platform] ?? ['gcc'];

    const candidates: string[] = [];

    for (const dir of directories) {
        for (const exe of executableNames) {
            candidates.push(path.join(dir, exe));
        }
    }

    const envPath = process.env.PATH ?? '';
    for (const dir of envPath.split(path.delimiter).filter(Boolean)) {
        for (const exe of executableNames) {
            candidates.push(path.join(dir, exe));
        }
    }

    for (const candidate of candidates) {
        try {
            if (fs.existsSync(candidate)) {
                return Ok(path.normalize(candidate));
            }
        } catch {
            // ignore inaccessible paths
        }
    }

    const fallback = executableNames.find(name => !name.includes(path.sep));
    if (fallback) {
        return Ok(fallback);
    }

    return Err(new Error('Unable to locate a GCC executable automatically. Please configure a custom compiler path in Elycode settings.'));
}

export function runExecutable(
    executablePath: string,
    input?: string,
    signal?: AbortSignal,
): Promise<Result<{ stdout: string; stderr: string }>> {
    return new Promise((resolve) => {
        const child = cp.spawn(executablePath, [], { stdio: ['pipe', 'pipe', 'pipe'] });

        const handleAbort = () => {
            if (!child.killed) {
                child.kill('SIGTERM');
            }
        };

        signal?.addEventListener('abort', handleAbort, { once: true });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', chunk => {
            stdout += chunk.toString();
        });

        child.stderr.on('data', chunk => {
            stderr += chunk.toString();
        });

        child.on('error', error => {
            if (error) {
                return resolve(RunError(error));
            }

            return resolve(Ok({ stdout, stderr }));
        });

        child.on('close', (code, sig) => {
            signal?.removeEventListener('abort', handleAbort);

            if (sig === 'SIGTERM') {
                return resolve(TimeLimitExceeded(new Error(`Execution exceeded ${configs.elycodeConfig.runnerConfig?.timeLimitSecond} seconds.`)));
            }

            if (code !== 0) {
                return resolve(RunError(new Error(stderr || `exit code ${code}`)));
            }

            return resolve(Ok({ stdout, stderr }));
        });

        if (input) {
            child.stdin.end(input);
        }
    });
}


interface BackgroundTaskOptions {
    runImmediately?: boolean;
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
}

export function startBackgroundTask(
    context: vscode.ExtensionContext,
    intervalMs: number,
    task: () => Promise<void>,
    options: BackgroundTaskOptions = {}
): NodeJS.Timeout {
    let running = false;
    const handleError = options.onError ?? ((error: unknown) => console.error('Background task error:', error));

    const execute = async () => {
        if (running) {
            return;
        }

        running = true;
        try {
            await task();
            options.onSuccess?.();
        } catch (error) {
            handleError(error);
        } finally {
            running = false;
        }
    };

    if (options.runImmediately) {
        void execute();
    }

    const timer = setInterval(() => {
        void execute();
    }, intervalMs);

    context.subscriptions.push({ dispose: () => clearInterval(timer) });

    return timer;
}