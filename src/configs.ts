import * as consts from './consts';

export type LanguageType = 'cpp' | undefined;

enum TemplateMode {
    auto = 'auto',
    custom = 'custom'
}

export class ElycodeConfig {
    codingConfig?: CodingConfig;
    compilerConfig?: CompilerConfig;
    runnerConfig?: RunnerConfig;
}

export class CodingConfig {
    constructor(
        public readonly newCodeTemplate: string
    ) { }
}

export class CompilerConfig {
    constructor(
        public readonly languageType: LanguageType,
        public readonly compilerPath: string,
        public readonly tempDir: string,
        public readonly extraParams: string,
    ) { }
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
            case TemplateMode.auto:
                this.template = consts.AUTO_TEMPLATE;
                break;
            case TemplateMode.custom:
                this.template = customTemplate;
                break;
            default:
                this.template = consts.AUTO_TEMPLATE;
                break;
        }
    }
}

export const elycodeConfig = new ElycodeConfig(); 