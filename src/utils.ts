import { execFile, spawn } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function compileCpp(sourcePath: string, outputPath: string): Promise<void> {
    await execFileAsync('g++', [sourcePath, '-std=c++17', '-O2', '-pipe', '-static', '-s', '-o', outputPath]);
}

export async function runExecutable(executablePath: string, input: string): Promise<{ stdout: string; stderr: string; error?: Error }> {
    return new Promise((resolve) => {
        const child = spawn(executablePath, [], { stdio: ['pipe', 'pipe', 'pipe'] });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', chunk => {
            stdout += chunk.toString();
        });

        child.stderr.on('data', chunk => {
            stderr += chunk.toString();
        });

        child.on('error', error => {
            resolve({ stdout, stderr, error });
        });

        child.on('close', code => {
            if (code !== 0) {
                resolve({ stdout, stderr, error: new Error(stderr || `Runtime Error (exit code ${code})`) });
                return;
            }

            resolve({ stdout, stderr });
        });

        child.stdin.end(input);
    });
}