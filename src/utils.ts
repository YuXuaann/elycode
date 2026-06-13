import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as cp from 'child_process';
import * as consts from './consts';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Result<T> = { result?: T, error?: Error };
export function Ok<T>(result: T): Result<T> { return { result }; }
export function Err<T>(error: Error): Result<T> { return { error }; }

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

export function runWithInput(executablePath: string, input: string): Promise<Result<{ stdout: string; stderr: string }>> {
    return new Promise((resolve) => {
        const child = cp.spawn(executablePath, [], { stdio: ['pipe', 'pipe', 'pipe'] });

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
                resolve(Err(error));
                return;
            }

            resolve(Ok({ stdout, stderr }));
        });

        child.on('close', code => {
            if (code !== 0) {
                resolve(Err(new Error(stderr || `Runtime Error (exit code ${code})`)));
                return;
            }

            resolve(Ok({ stdout, stderr }));
        });

        child.stdin.end(input);
    });
}