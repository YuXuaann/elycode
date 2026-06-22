import * as fs from 'fs';
import * as cp from 'child_process';
import * as path from 'path';
import { path7za } from '7zip-bin';
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

export async function downloadFile(
    url: string,
    destination: string,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken
): Promise<void> {
    await fs.promises.mkdir(path.dirname(destination), { recursive: true });

    return new Promise((resolve, reject) => {
        const curlArgs = ['-L', '--fail', '--retry', '3', '--output', destination, url];
        const commandCandidates = process.platform === 'win32'
            ? ['curl', 'curl.exe']
            : ['curl'];
        let child: cp.ChildProcess | undefined;
        let lastPercent = 0;
        const totalDownloadQuota = 40;
        const completionBonus = 10;

        const cleanupOnError = async (error: Error) => {
            try {
                await fs.promises.rm(destination, { force: true });
            } catch {
                // ignore cleanup errors
            }
            reject(error);
        };

        const startCommand = (index: number) => {
            if (index >= commandCandidates.length) {
                cleanupOnError(new Error('wget binary not found on PATH. Please install wget and try again.'));
                return;
            }

            const candidate = commandCandidates[index];
            try {
                child = cp.spawn(candidate, curlArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
            } catch (error) {
                const err = error as NodeJS.ErrnoException;
                if (err.code === 'ENOENT') {
                    startCommand(index + 1);
                    return;
                }
                cleanupOnError(new Error(`Failed to start curl: ${err.message}`));
                return;
            }

            const handleProgressOutput = (data: Buffer) => {
                const text = data.toString();
                const matches = [...text.matchAll(/(\d{1,3})\.\d*%/g)];
                if (matches.length === 0) {
                    return;
                }

                const lastMatch = matches[matches.length - 1][0];
                const percent = Number(lastMatch.replace('%', ''));
                if (Number.isNaN(percent) || percent <= lastPercent) {
                    return;
                }

                const increment = ((percent - lastPercent) / 100) * totalDownloadQuota;
                lastPercent = percent;
                progress.report({ message: `Downloading... ${percent.toFixed(1)}%`, increment });
            };

            child.stderr?.on('data', handleProgressOutput);

            token.onCancellationRequested(() => {
                if (child && !child.killed) {
                    child.kill('SIGTERM');
                }
            });

            child.on('error', error => {
                const err = error as NodeJS.ErrnoException;
                if (err.code === 'ENOENT') {
                    startCommand(index + 1);
                    return;
                }
                cleanupOnError(new Error(`curl error: ${err.message}`));
            });

            child.on('close', async code => {
                if (code === 0) {
                    const filled = (lastPercent / 100) * totalDownloadQuota;
                    progress.report({
                        message: 'Download completed',
                        increment: Math.max(0, totalDownloadQuota - filled) + completionBonus
                    });
                    resolve();
                    return;
                }

                const err = new Error(`curl exited with code ${code ?? 'unknown'}`);
                await cleanupOnError(err);
            });
        };

        startCommand(0);
    });
}

export async function extractArchive(
    archivePath: string,
    destinationDir: string,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken
): Promise<Result<void>> {
    await fs.promises.mkdir(destinationDir, { recursive: true });

    return new Promise((resolve) => {
        let cancelled = false;
        const sevenZip = cp.spawn(path7za, ['x', archivePath, `-o${destinationDir}`, '-y']);

        const onData = (data: Buffer) => {
            const output = data.toString();
            const match = output.match(/Extracting\s+(.*)/);
            if (match && match[1]) {
                progress.report({ message: `Extracting: ${match[1].trim()}` });
            }
        };

        sevenZip.stdout.on('data', onData);
        sevenZip.stderr.on('data', onData);

        token.onCancellationRequested(() => {
            cancelled = true;
            sevenZip.kill('SIGTERM');
        });

        sevenZip.on('error', error => {
            resolve(Err(new Error(`7z extraction error: ${error.message}`)));
        });

        sevenZip.on('close', code => {
            if (cancelled) {
                resolve(Err(new Error('Extraction cancelled')));
                return;
            }

            if (code !== 0) {
                resolve(Err(new Error(`7z extraction failed with exit code ${code}`)));
                return;
            }

            progress.report({ message: 'Extraction completed', increment: 50 });
            resolve(Ok(undefined));
        });
    });
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
    task: () => Promise<Result<void>>,
    options: BackgroundTaskOptions = {}
): NodeJS.Timeout {
    let running = false;
    const handleError = options.onError ?? ((error: unknown) => console.error('Background task error:', error));

    const execute = async () => {
        if (running) {
            return;
        }

        running = true;

        const { error } = await task();
        if (error) {
            handleError(error);
        } else {
            options.onSuccess?.();
        }

        running = false;
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