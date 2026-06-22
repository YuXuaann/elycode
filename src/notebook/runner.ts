import * as config from "../configs";
import * as fs from 'fs';
import * as utils from '../utils';
import * as func from './func';
import * as compiler from './compiler';
import { Result, Ok, Err } from "../utils";

export class CodeRunner extends compiler.Compiler {
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