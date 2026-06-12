export type LanguageType = 'cpp' | undefined;

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
    constructor(
        public readonly timeLimitSecond: number,
        public readonly memoryLimitMB: number,
    ) { }
}

export const elycodeConfig = new ElycodeConfig(); 