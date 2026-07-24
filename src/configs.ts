import * as consts from './consts';
import * as meta from './contest/meta';
import { Result, Ok } from "./utils";
import * as fs from 'fs';

export enum LanguageType {
    C = 'c/cpp',
    unknown = 'unknown'
}

export enum CompilerDetectMode {
    autoGCC = 'auto detect(gcc)',
    customGCC = 'custom(gcc)',
}

enum TemplateMode {
    auto = 'auto',
    custom = 'custom'
}

export class ElycodeConfig {
    updateContestInfoIntervalSecond = 60;
    platformConfig = new Map<meta.Platform, PlatformConfig>();
    compilerConfig?: CompilerConfig;
    runnerConfig?: RunnerConfig;
}

export class PlatformConfig {
    userName?: string;
    constructor(
        userName: string,
    ) {
        if (userName !== '') {
            this.userName = userName;
        }
    }
}

export class CompilerConfig {
    public readonly extraParams: string[];
    constructor(
        public readonly languageType: LanguageType,
        public readonly compilerPath: string,
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
        extraParams: string,
    ): Result<CompilerConfig> {
        switch (compilerDetectMode) {
            case CompilerDetectMode.customGCC:
                return Ok(new CompilerConfig(LanguageType.C, compilerCustomPath, extraParams));
            case CompilerDetectMode.autoGCC:
            default:
                return Ok(new CompilerConfig(LanguageType.C, CompilerDetectMode.autoGCC, extraParams));
        }
    }
}

export class RunnerConfig {

    constructor(
        public readonly timeLimitSecond: number,
        public readonly memoryLimitMB: number,
        public readonly template: string,
    ) {}

    static async create(
        timeLimitSecond: number,
        memoryLimitMB: number,
        templateMode: string,
        customTemplate: string,
        customTemplateFile: string,
    ) {
        let template: string;
        switch (templateMode ) {
            case TemplateMode.custom:
                if (customTemplateFile) {
                    template = await this.loadCustomTemplate(customTemplateFile);
                    break;
                }

                template = customTemplate;
                break;
            case TemplateMode.auto:
            default:
                template = consts.AUTO_CODE_TEMPLATE;
                break;
        }

        return new RunnerConfig(
            timeLimitSecond,
            memoryLimitMB,
            template
        );
    }

    private static async loadCustomTemplate(
        templatePath: string
    ): Promise<string> {

        if (!templatePath) {
            throw new Error(
                "Custom template path is empty"
            );
        }

        try {
            return await fs.promises.readFile(
                templatePath,
                {
                    encoding: "utf8"
                }
            );
        } catch (error) {
            throw new Error(
                `Failed to read template: ${error}`
            );
        }
    }
}

export const elycodeConfig = new ElycodeConfig();