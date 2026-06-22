import * as fs from 'fs';
import * as consts from './consts';
import { Result, Ok } from "./utils";

export enum LanguageType {
    C = 'c/cpp',
    unknown = 'unknown'
}

enum CompilerDetectMode {
    autoGCC = 'auto detect(gcc)',
    customGCC = 'custom(gcc)',
}

enum TemplateMode {
    auto = 'auto',
    custom = 'custom'
}

export class ElycodeConfig {
    platformConfig?: PlatformConfig;
    compilerConfig?: CompilerConfig;
    runnerConfig?: RunnerConfig;
}

export class PlatformConfig {
    codeforcesUserName?: string;
    constructor(
        codeforcesUserName: string,
        public readonly updateContestInfoIntervalSecond: number,
    ) {
        if (codeforcesUserName !== '') {
            this.codeforcesUserName = codeforcesUserName;
        }
    }
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

    static async new(
        compilerDetectMode: string,
        compilerCustomPath: string,
        tempDir: string,
        extraParams: string,
    ): Promise<Result<CompilerConfig>> {
        await fs.promises.mkdir(tempDir, { recursive: true });
        switch (compilerDetectMode) {
            case CompilerDetectMode.customGCC:
                return Ok(new CompilerConfig(LanguageType.C, compilerCustomPath, tempDir, extraParams));
            case CompilerDetectMode.autoGCC:
            default:
                return Ok(new CompilerConfig(LanguageType.C, CompilerDetectMode.autoGCC, tempDir, extraParams));
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