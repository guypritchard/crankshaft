import { BedrockDownloader } from './BedrockDownloader';
import { BedrockDownloadPageParser } from './BedrockDownloadPageParser';
import { BedrockInstaller } from './BedrockInstaller';
import { BedrockRunner } from './BedrockRunner';
import { WorldConfiguration, ServerState, ServerStatus, ServerConfiguration } from '../interfaces/types';
import { BedrockWorldConfiguration } from './BedrockWorldConfiguration';

export class BedrockState {
    config: WorldConfiguration | null = null;
    runner: BedrockRunner;
    process: Promise<void> = Promise.resolve();
    serverState: ServerStatus = ServerStatus.Unknown;
    constructor(private configuration: ServerConfiguration) {
        this.runner = new BedrockRunner(this.configuration?.basePath ?? '');
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

        if (builds.length === 0) {
            throw new Error('No builds found');
        }

        const windowsBuild = builds.filter((b) => b.platform === 'windows');
        if (windowsBuild.length === 0) {
            throw new Error('No compatible builds found.');
        }
        this.config = new BedrockWorldConfiguration(this.configuration.basePath);

        await downloader.download(this.configuration?.versionCache || '', windowsBuild[0]);
        console.log('Installing...');
        await this.stop();
        await installer.install(windowsBuild[0], this.configuration?.versionCache, this.configuration?.basePath);
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

        console.log('Installed version: ' + currentVersion?.version);
        console.log('Latest windows version:' + windowsBuild[0].version);

        this.config = new BedrockWorldConfiguration(this.configuration.basePath);

        if (windowsBuild[0].version !== currentVersion?.version) {
            await downloader.download(this.configuration?.versionCache || '', windowsBuild[0]);
            console.log('Installing...');
            await this.stop();
            await installer.install(windowsBuild[0], this.configuration?.versionCache, this.configuration?.basePath);
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

        this.process = this.runner.start();
        this.config = new BedrockWorldConfiguration(this.configuration.basePath);
        this.serverState = ServerStatus.Running;
    }

    public async stop(): Promise<void> {
        this.runner.stop();
        await this.process;
        this.serverState = ServerStatus.Stopped;
    }

    public state(): ServerState {
        return {
            state: this.serverState,
            pid: this.runner.pid,
            stdout: this.runner.stdout,
            version: this.runner.version(),
            crankShaftConfig: this.configuration,
            bedrockConfig: this.config,
        };
    }
}
