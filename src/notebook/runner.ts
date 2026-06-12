import * as config from "../configs";
import * as fs from 'fs';
import * as cp from 'child_process';
import * as path from 'path';
import * as util from 'util';
import { Result, Ok, Err } from "../consts";

const execFileAsync = util.promisify(cp.execFile);

class Compiler {
    constructor(
        private readonly config: config.CompilerConfig,
    ) { }

    async compileToTemp(codePath: string): Promise<Result<string>> {
        const cfg = this.config;
        const tempDir = await fs.promises.mkdtemp(path.join(cfg.tempDir, 'elycode-run-'));
        const executablePath = path.join(tempDir, "elycode.out");
        await execFileAsync(cfg.compilerPath, [codePath, cfg.extraParams, '-o', executablePath]);
        return Ok(executablePath);
    }
}

export class CodeRunner extends Compiler {
    constructor(
        compilerConfig: config.CompilerConfig,
        private readonly runnerConfig: config.RunnerConfig,
    ) {
        super(compilerConfig);
    }

    private runWithInput(executablePath: string, input: string): Promise<Result<{ stdout: string; stderr: string }>> {
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

    async run(codePath: string, input: string): Promise<Result<string>> {
        if (!fs.existsSync(codePath)) {
            return Err(new Error(`The code file ${codePath} doesn't exist.`));
        }

        const { result: executable, error: compileError } = await this.compileToTemp(codePath);
        if (compileError) {
            return Err(compileError);
        }

        const { result: runResult, error: runError } = await this.runWithInput(executable!, input);
        if (runError) {
            return Err(runError);
        }

        const { stdout, stderr } = runResult!;
        if (stderr != '') {
            return Err(new Error(`The code file ${codePath} run with stderr ${stderr}`));
        }

        return Ok(stdout);
    }
}