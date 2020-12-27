import { BedrockConfiguration } from "./BedrockConfiguration";
import { BedrockDownloader } from "./BedrockDownloader";
import { BedrockDownloadPageParser } from "./BedrockDownloadPageParser";
import { BedrockInstaller } from "./BedrockInstaller";
import { BedrockRunner } from "./BedrockRunner";
import { download } from "./BedrockUpdater";
import { JSONFile } from "./utils/JSONFile";

export class BedrockState {
    watcher: BedrockRunner;
    process: Promise<void> = Promise.resolve();
    configuration: BedrockConfiguration | null;
    constructor() {
        this.configuration = JSONFile.read<BedrockConfiguration>('Configuration.json');
        this.watcher = new BedrockRunner(this.configuration?.basePath ?? '');
    }

    public async update(): Promise<void> {
        const currentVersion = this.watcher.version();
        const parser = new BedrockDownloadPageParser();
        const downloader = new BedrockDownloader();
        const installer = new BedrockInstaller();
    
        console.log("Checking current Bedrock Server version.");
        const builds = await parser.getBedrockVersions();
    
        if (builds.length === 0) {
            throw new Error("No builds found");
        }
    
        const windowsBuild = builds.filter(b => b.platform === 'windows');
        if (windowsBuild.length === 0) {
            throw new Error("No compatible builds found.");
        }
    
        console.log("Installed version: " + currentVersion?.version);
        console.log("Latest windows version:" + windowsBuild[0].version);

        if (windowsBuild[0].version !== currentVersion?.version) {
            console.log("Downloading...");
            await downloader.download(windowsBuild[0]);
            console.log("Installing...");
            await installer.install(windowsBuild[0], this.configuration?.basePath ?? '');
        } else {
            console.log("Current version already downloaded.");
        }
    }

    public async start(): Promise<void> {
        await this.update();
        console.log("Starting...")
        this.process = this.watcher.start();
    }

    public async stop(): Promise<void> {
        this.watcher.stop();
        await this.process
    }
}