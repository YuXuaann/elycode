import * as configs from "../configs";
import * as fs from 'fs';
import * as cp from 'child_process';
import * as path from 'path';
import * as util from 'util';
import * as utils from "../utils";
import * as os from 'os';
import * as consts from '../consts';
import * as vscode from 'vscode';
import { Result, Ok, Err } from "../utils";

const execFileAsync = util.promisify(cp.execFile);

export class Compiler {
    public readonly platform: NodeJS.Platform;
    public adoptDirectories: string[];

    constructor(
        private readonly config: configs.CompilerConfig,
    ) {
        const platform = os.platform();
        this.platform = platform;
        switch (config.languageType) {
            default:
            case configs.LanguageType.C: {
                this.adoptDirectories = consts.GCC_DIRECTORIES_BY_PLATFORM[platform];
                this.adoptDirectories.push(this.autoGCCDir());
            }
        }
    }

    private autoGCCDir(): string {
        const autoGCCdir = consts.AUTO_GCC_DIRECTORIE_BY_PLATFORM[this.platform];
        return path.join(consts.extensionDir, autoGCCdir);
    }

    detectGCCExecutable(): Result<string> {
        const executableNames = consts.GCC_EXECUTABLE_NAMES[this.platform] ?? ['gcc'];

        const candidates: string[] = [];

        for (const dir of this.adoptDirectories) {
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

        return Err(new Error('Unable to locate a GCC executable automatically. Please configure a custom compiler path in Elycode settings.'));
    }

    async autoDownloadGCC(): Promise<Result<string>> {
        const consent = await vscode.window.showInformationMessage(
            'Elycode could not detect a local GCC installation. Allow automatic download and configuration of GCC?',
            { modal: true },
            'OK',
            'Cancel'
        );

        if (consent !== 'OK') {
            return Err(new Error('User declined automatic GCC download.'));
        }

        const extractionDir = this.autoGCCDir();
        await fs.promises.mkdir(extractionDir, { recursive: true });
        const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'elycode-gcc-'));
        const archivePath = path.join(tempDir, 'gcc.7z');
        utils.vsPrint(`archivePath: ${archivePath}`);

        const cleanup = async () => {
            await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
        };

        try {
            const gccPath = await vscode.window.withProgress<string | undefined>(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Elycode: Downloading and configuring GCC',
                    cancellable: true
                },
                async (progress, token) => {
                    progress.report({ message: 'Downloading...', increment: 0 });

                    await fs.promises.mkdir(path.dirname(archivePath), { recursive: true });
                    const downloadURL = consts.AUTO_GCC_DOWNLOAD_URL_BY_PLATFORM[this.platform];
                    await utils.downloadFile(downloadURL, archivePath, progress, token);

                    if (token.isCancellationRequested) {
                        throw new Error('Download cancelled');
                    }

                    progress.report({ message: 'Extracting archive...', increment: 50 });

                    const entries = await utils.extractArchive(archivePath, extractionDir, progress, token);
                    const gccEntry = entries.find(entry => /gcc\.exe$/i.test(entry));
                    if (!gccEntry) {
                        throw new Error('Unable to locate gcc.exe after extraction.');
                    }

                    const absolutePath = path.normalize(path.join(extractionDir, gccEntry));
                    return absolutePath;
                }
            );

            if (!gccPath) {
                return Err(new Error('Automatic GCC download cancelled.'));
            }

            utils.vsPrint(`GCC downloaded and configured: ${gccPath}`);
            return Ok(gccPath);
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            vscode.window.showErrorMessage(`Failed to download or extract GCC: ${err.message}`);
            return Err(err);
        } finally {
            await cleanup();
        }
    }

    async getCompilerPath(): Promise<Result<string>> {
        switch (this.config.languageType) {
            default:
            case configs.LanguageType.C: {
                const { result, error } = this.detectGCCExecutable();
                if (error) {
                    const { result, error: downloadErr } = await this.autoDownloadGCC();
                    if (downloadErr) {
                        return Err(downloadErr);
                    }
                    return Ok(result!);
                }
                return Ok(result!);
            }
        }
    }

    async compileToTemp(codePath: string): Promise<Result<string>> {
        const cfg = this.config;
        const tempDir = fs.mkdtempSync(path.join(cfg.tempDir, 'elycode-run-'));
        const executablePath = path.join(tempDir, "elycode.out");
        const { result: compilerPath, error } = await this.getCompilerPath();
        if (error) {
            return Err(new Error(`Complier configure failed: ${error.message}. You can set custom compiler path.`));
        }
        try {
            const compileResult = await execFileAsync(compilerPath!, [codePath, ...cfg.extraParams, '-o', executablePath]);
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