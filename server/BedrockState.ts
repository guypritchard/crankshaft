import { BedrockDownloader } from './BedrockDownloader.js';
import { BedrockDownloadPageParser } from './BedrockDownloadPageParser.js';
import { BedrockInstaller } from './BedrockInstaller.js';
import { BedrockRunner } from './BedrockRunner.js';
import { WorldConfiguration, ServerState, ServerStatus, ServerConfiguration } from '../interfaces/types.js';
import { BedrockWorldConfiguration } from './BedrockWorldConfiguration.js';
import path from 'path';

export class BedrockState {
  config: WorldConfiguration | null = null;
  runner: BedrockRunner;
  process: Promise<void> = Promise.resolve();
  serverState: ServerStatus = ServerStatus.Unknown;
  path: string;
  constructor(private id: number = 0, private port: number = 19132, private configuration: ServerConfiguration) {
    this.path = path.join(this.configuration?.basePath, this.id.toString(), 'bedrock');
    this.runner = new BedrockRunner(this.path);
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

    await downloader.download(this.configuration?.versionCache || '', windowsBuild[0]);
    console.log('Installing...');
    await this.stop();
    await installer.install(windowsBuild[0], this.configuration?.versionCache, this.path);
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

    this.config = new BedrockWorldConfiguration(this.path);
    this.config.setPort(this.port);

    if (windowsBuild[0].version !== currentVersion?.version) {
      await downloader.download(this.configuration?.versionCache || '', windowsBuild[0]);
      console.log('Installing...');
      await this.stop();
      await installer.install(windowsBuild[0], this.configuration?.versionCache, this.path);
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
    this.process = this.runner.start();
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
