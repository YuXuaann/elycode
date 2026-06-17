import * as config from "../configs";
import * as fs from 'fs';
import * as cp from 'child_process';
import * as path from 'path';
import * as util from 'util';
import * as utils from '../utils';
import * as func from './func';
import { Result, Ok, Err } from "../utils";

const execFileAsync = util.promisify(cp.execFile);

class Compiler {
    constructor(
        private readonly config: config.CompilerConfig,
    ) { }

    async compileToTemp(codePath: string): Promise<Result<string>> {
        const cfg = this.config;
        const tempDir = fs.mkdtempSync(path.join(cfg.tempDir, 'elycode-run-'));
        const executablePath = path.join(tempDir, "elycode.out");
        try {
            const compileResult = await execFileAsync(cfg.compilerPath, [codePath, ...cfg.extraParams, '-o', executablePath]);
            if (compileResult.stderr) {
                return Err(new Error(compileResult.stderr));
            }
            return Ok(executablePath);
        } catch (error) {
            const err = error as cp.ExecFileException & { stderr?: string };
            const stderr = err?.stderr?.trim();
            const message = stderr && stderr.length > 0 ? stderr : err.message;
            return Err(new Error(message));
        }
    }
}

export class CodeRunner extends Compiler {
    constructor(
        compilerConfig: config.CompilerConfig,
        private readonly runnerConfig: config.RunnerConfig,
    ) {
        super(compilerConfig);
    }

    async run(codePath: string, input: string, sampleOutput?: string): Promise<Result<string>> {
        if (!fs.existsSync(codePath)) {
            return Err(new Error(`The code file ${codePath} doesn't exist.`));
        }

        const { result: executable, error: compileError } = await this.compileToTemp(codePath);
        if (compileError) {
            return utils.CompileError(compileError);
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(utils.TimeLimitExceeded(new Error(`Execution exceeded the time limit of ${this.runnerConfig.timeLimitSecond} seconds`))), this.runnerConfig.timeLimitSecond * 1000);
        const { result: runResult, error: runError } = await utils.runExecutable(executable!, input, controller.signal);
        clearTimeout(timer);
        if (runError) {
            return Err(runError);
        }

        const { stdout, stderr } = runResult!;
        if (stderr != '') {
            return utils.RunError(new Error(`The code file ${codePath} run with stderr ${stderr}`));
        }

        return Ok(func.show(stdout, sampleOutput!));
    }
}