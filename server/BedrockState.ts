import { BedrockDownloader } from './BedrockDownloader';
import { BedrockDownloadPageParser } from './BedrockDownloadPageParser';
import { BedrockInstaller } from './BedrockInstaller';
import { BedrockRunner } from './BedrockRunner';
import { WorldConfiguration, ServerState, ServerStatus, ServerConfiguration } from '../interfaces/types';
import { BedrockWorldConfiguration } from './BedrockWorldConfiguration';
import path from 'path';
import { BEDROCK_DEFAULT_PORT } from './Constants';
import * as fs from 'fs';
import unzipper, { File as UnzipperFile } from 'unzipper';

export class BedrockState {
    config: WorldConfiguration | null = null;
    runner: BedrockRunner;
    process: Promise<void> = Promise.resolve();
    serverState: ServerStatus = ServerStatus.Unknown;
    path: string;
    constructor(
        private id: number = 0,
        private port: number = BEDROCK_DEFAULT_PORT,
        private configuration: ServerConfiguration,
    ) {
        this.path = path.join(this.configuration?.basePath, this.id.toString(), 'bedrock');
        this.runner = new BedrockRunner(this.path);
    }

    public getPort(): number {
        return this.port;
    }

    public async backup(): Promise<void> {
        if (this.serverState === ServerStatus.Running) {
            await this.runner.backup();
        } else {
            throw new Error("Server isn't running");
        }
    }

    public async install(): Promise<boolean> {
        const parser = new BedrockDownloadPageParser();
        const downloader = new BedrockDownloader();
        const installer = new BedrockInstaller();

        console.log('Checking current Bedrock Server version.');
        const builds = await parser.getBedrockVersions();

        console.log(builds);

        if (builds.length === 0) {
            throw new Error('No builds found');
        }

        const windowsBuild = builds.filter((b) => b.platform === 'windows');
        if (windowsBuild.length === 0) {
            throw new Error('No compatible builds found.');
        }

        this.config = new BedrockWorldConfiguration(this.path);
        this.config.setPort(this.port);

        try {
            await downloader.download(this.configuration?.versionCache || '', windowsBuild[0]);
            console.log('Installing...');
            await this.stop();
            await installer.install(windowsBuild[0], this.configuration?.versionCache, this.path);
            return true;
        } catch {
            return false;
        }
    }

    public async changeWorld(worldName: string): Promise<boolean> {
        if (this.config?.world == worldName) {
            return false;
        }

        await this.stop();
        this.config?.setCurrentWorld(worldName);
        await this.start();
        return true;
    }

    public async update(): Promise<boolean> {
        const currentVersion = this.runner.version();
        const parser = new BedrockDownloadPageParser();
        const downloader = new BedrockDownloader();
        const installer = new BedrockInstaller();

        console.log('Checking current Bedrock Server version.');
        const builds = await parser.getBedrockVersions();

        if (builds.length === 0) {
            throw new Error('No builds found');
        }

        const windowsBuild = builds.filter((b) => b.platform === 'windows');
        if (windowsBuild.length === 0) {
            throw new Error('No compatible builds found.');
        }

        console.log('Installed version: ' + currentVersion?.build);
        console.log('Latest windows version:' + windowsBuild[0].build);

        this.config = new BedrockWorldConfiguration(this.path);
        this.config.setPort(this.port);

        if (windowsBuild[0].build !== currentVersion?.build) {
            await downloader.download(this.configuration?.versionCache || '', windowsBuild[0]);
            console.log('Installing...');
            await this.stop();
            await installer.install(windowsBuild[0], this.configuration?.versionCache, this.path);

            // Set configuration back to what it was before the upgrade.
            this.config?.setCurrentWorld(this.config?.world);
            this.config?.setMode(this.config?.mode);
            this.config?.enableDetailedTelemetry();

            await this.start();
            return true;
        }

        console.log('Current version already installed.');
        return false;
    }

    public async start(): Promise<void> {
        if (this.runner.version() == null) {
            console.log('No bedrock installed -- installing.');
            await this.install();
        }

        this.config = new BedrockWorldConfiguration(this.path);
        this.config.setPort(this.port);
        this.serverState = ServerStatus.Running;
        this.process = this.runner
            .start()
            .then(() => {
                if (this.serverState === ServerStatus.Running) {
                    this.serverState = ServerStatus.Stopped;
                }
            })
            .catch((error) => {
                console.error(`Bedrock server ${this.id} encountered an error:`, error);
                this.serverState = ServerStatus.Stopped;
            });
    }

    public async stop(): Promise<void> {
        this.runner.stop();
        await this.process;
        this.serverState = ServerStatus.Stopped;
    }

    public async importWorld(archiveBuffer: Buffer, originalFileName: string): Promise<ServerState> {
        if (this.serverState !== ServerStatus.Stopped) {
            throw new Error('Stop the server before importing a world.');
        }

        if (!Buffer.isBuffer(archiveBuffer) || archiveBuffer.length === 0) {
            throw new Error('Uploaded file is empty.');
        }

        const extension = path.extname(originalFileName ?? '').toLowerCase();
        if (extension !== '.mcworld') {
            throw new Error('Only .mcworld files are supported.');
        }

        const archive = await unzipper.Open.buffer(archiveBuffer);
        if (archive.files.length === 0) {
            throw new Error('Unable to read the uploaded archive.');
        }

        let containsLevelDat = false;
        let inferredWorldName: string | null = null;
        const rootFolder = this.detectRootFolder(archive.files);
        const extractedEntries: Array<{ path: string; type: 'Directory' | 'File'; data?: Buffer }> = [];

        for (const entry of archive.files) {
            const normalizedPath = this.normalizeEntryPath(entry.path, rootFolder);
            if (entry.path.toLowerCase().endsWith('level.dat')) {
                containsLevelDat = true;
            }

            if (entry.type === 'Directory') {
                if (normalizedPath != null) {
                    extractedEntries.push({ path: normalizedPath, type: 'Directory' });
                }
                continue;
            }

            const content = await entry.buffer();

            if (inferredWorldName == null && entry.path.toLowerCase().endsWith('levelname.txt')) {
                const candidate = content.toString('utf8').trim();
                if (candidate.length > 0) {
                    inferredWorldName = candidate;
                }
            }

            if (normalizedPath != null) {
                extractedEntries.push({ path: normalizedPath, type: 'File', data: content });
            }
        }

        if (!containsLevelDat) {
            throw new Error('The uploaded file is not a valid .mcworld archive.');
        }

        const fallbackName = path.basename(originalFileName, extension) || `world-${Date.now()}`;
        const worldName = this.sanitizeWorldName(inferredWorldName ?? fallbackName);

        const worldsDirectory = path.join(this.path, 'worlds');
        const destination = path.join(worldsDirectory, worldName);
        await fs.promises.mkdir(worldsDirectory, { recursive: true });
        await fs.promises.rm(destination, { recursive: true, force: true });
        await fs.promises.mkdir(destination, { recursive: true });

        for (const entry of extractedEntries) {
            const targetPath = path.join(destination, entry.path);
            if (entry.type === 'Directory') {
                await fs.promises.mkdir(targetPath, { recursive: true });
            } else if (entry.data != null) {
                await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
                await fs.promises.writeFile(targetPath, entry.data);
            }
        }

        if (this.config == null) {
            this.config = new BedrockWorldConfiguration(this.path);
            this.config.setPort(this.port);
        }

        this.config.refreshWorlds();
        this.config.setCurrentWorld(worldName);
        this.config.refreshWorlds();

        return this.state();
    }

    public state(): ServerState {
        this.config?.refreshWorlds();

        return {
            state: this.serverState,
            pid: this.runner.pid,
            stdout: this.runner.stdout,
            version: this.runner.version(),
            crankShaftConfig: this.configuration,
            bedrockConfig: this.config,
            exitCode: this.runner.lastExitCode,
        };
    }

    private detectRootFolder(entries: UnzipperFile[]): string | null {
        const roots = entries
            .map(
                (entry) =>
                    entry.path
                        .replace(/\\/g, '/')
                        .split('/')
                        .filter((segment) => segment.length > 0)[0],
            )
            .filter((segment): segment is string => segment != null && segment.length > 0);

        if (roots.length === 0) {
            return null;
        }

        const candidate = roots[0];
        return roots.every((root) => root === candidate) ? candidate : null;
    }

    private normalizeEntryPath(entryPath: string, rootFolder: string | null): string | null {
        const cleanedPath = entryPath.replace(/\\/g, '/');
        const segments = cleanedPath
            .split('/')
            .filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..');

        if (segments.length === 0) {
            return null;
        }

        if (rootFolder != null && segments[0] === rootFolder) {
            segments.shift();
        }

        if (segments.length === 0) {
            return null;
        }

        return segments.join(path.sep);
    }

    private sanitizeWorldName(name: string): string {
        const trimmed = name.trim();
        const sanitized = trimmed
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
            .replace(/\s+/g, ' ')
            .trim();
        if (sanitized.length === 0) {
            return `world-${Date.now()}`;
        }

        return sanitized.slice(0, 64);
    }
}
