import { BedrockConfiguration } from './BedrockConfiguration';
import { BedrockDownloader } from './BedrockDownloader';
import { BedrockDownloadPageParser } from './BedrockDownloadPageParser';
import { BedrockInstaller } from './BedrockInstaller';
import { BedrockRunner } from './BedrockRunner';
import { BedrockWorldConfiguration } from './BedrockWorldConfiguration';

export enum ServerState {
    Unknown = 0,
    Running = 1,
    Stopped = 2,
}

export class BedrockState {
    config: BedrockWorldConfiguration | null = null;
    runner: BedrockRunner;
    process: Promise<void> = Promise.resolve();
    serverState: ServerState = ServerState.Unknown;
    constructor(private configuration: BedrockConfiguration) {
        this.runner = new BedrockRunner(this.configuration?.basePath ?? '');
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
        this.process = this.runner.start();
        this.config = new BedrockWorldConfiguration(this.configuration.basePath);
        this.serverState = ServerState.Running;
    }

    public async stop(): Promise<void> {
        this.runner.stop();
        await this.process;
        this.serverState = ServerState.Stopped;
    }

    public state(): unknown {
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
