import * as fs from 'fs';
import * as cp from 'child_process';
import * as https from 'https';
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
    return new Promise((resolve, reject) => {
        const request = https.get(url, response => {
            if (response.statusCode && response.statusCode >= 400) {
                reject(new Error(`HTTP ${response.statusCode} while downloading GCC`));
                return;
            }

            const total = Number(response.headers['content-length'] ?? 0);
            let received = 0;

            const writeStream = fs.createWriteStream(destination);

            const updateProgress = () => {
                if (total > 0) {
                    const increment = (received / total) * 40;
                    progress.report({ message: `Downloading... ${(received / total * 100).toFixed(1)}%`, increment });
                }
            };

            response.on('data', chunk => {
                received += chunk.length;
                updateProgress();
            });

            token.onCancellationRequested(() => {
                writeStream.destroy(new Error('Download cancelled'));
                request.destroy(new Error('Download cancelled'));
            });

            response.pipe(writeStream);

            writeStream.on('finish', () => {
                progress.report({ message: 'Download succeed', increment: 10 });
                resolve();
            });

            writeStream.on('error', error => {
                reject(error);
            });
        });

        request.on('error', error => {
            reject(error);
        });
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