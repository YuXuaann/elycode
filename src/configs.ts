import * as fs from 'fs';
import * as consts from './consts';
import * as utils from './utils';
import { Result, Ok, Err } from "./utils";

export type LanguageType = 'c/cpp' | undefined;

enum CompilerDetectMode {
    autoGCC = 'auto detect(gcc)',
    customGCC = 'custom(gcc)',
}

enum TemplateMode {
    auto = 'auto',
    custom = 'custom'
}

export class ElycodeConfig {
    compilerConfig?: CompilerConfig;
    runnerConfig?: RunnerConfig;
}

export class CompilerConfig {
    public readonly extraParams: string[];
    constructor(
        public readonly languageType: LanguageType,
        public readonly compilerPath: string,
        public readonly tempDir: string,
        extraParams: string,
    ) {
        const parsedParams = extraParams
            .split(/\s+/)
            .map(param => param.trim())
            .filter(Boolean);
        const mergedParams: string[] = [];

        switch (languageType) {
            default:
            case 'c/cpp':
                {
                    mergedParams.push(...consts.GCC_EXTRA_PARAMS);
                    for (const param of parsedParams) {
                        if (!mergedParams.includes(param)) {
                            mergedParams.push(param);
                        }
                    }
                }
        }

        this.extraParams = mergedParams;
    }

    static new(
        compilerDetectMode: string,
        compilerCustomPath: string,
        tempDir: string,
        extraParams: string,
    ): Result<CompilerConfig> {
        fs.mkdirSync(tempDir, { recursive: true });
        switch (compilerDetectMode) {
            case CompilerDetectMode.customGCC:
                return Ok(new CompilerConfig('c/cpp', compilerCustomPath, tempDir, extraParams));
            case CompilerDetectMode.autoGCC:
            default:
                {
                    const { result, error } = utils.detectGccExecutable();
                    if (error) {
                        return Err(error);
                    }
                    return Ok(new CompilerConfig('c/cpp', result!, tempDir, extraParams));
                }
        }
    }
}

export class RunnerConfig {
    public readonly template: string;

    constructor(
        public readonly timeLimitSecond: number,
        public readonly memoryLimitMB: number,
        templateMode: string,
        customTemplate: string,
    ) {
        switch (templateMode) {
            case TemplateMode.custom:
                this.template = customTemplate;
                break;
            case TemplateMode.auto:
            default:
                this.template = consts.AUTO_CODE_TEMPLATE;
                break;
        }
    }
}

export const elycodeConfig = new ElycodeConfig(); 