import { BedrockConfiguration } from "./BedrockConfiguration";
import { BedrockDownloader } from "./BedrockDownloader";
import { BedrockDownloadPageParser } from "./BedrockDownloadPageParser";
import { BedrockInstaller } from "./BedrockInstaller";
import { BedrockRunner } from "./BedrockRunner";
import { JSONFile } from "../utils/JSONFile";

export class BedrockState {
  runner: BedrockRunner;
  process: Promise<void> = Promise.resolve();
  configuration: BedrockConfiguration | null;
  constructor() {
    this.configuration = JSONFile.read<BedrockConfiguration>(
      "Configuration.json"
    );
    this.runner = new BedrockRunner(this.configuration?.basePath ?? "");
  }

  public async update(): Promise<boolean> {
    const currentVersion = this.runner.version();
    const parser = new BedrockDownloadPageParser();
    const downloader = new BedrockDownloader();
    const installer = new BedrockInstaller();

    console.log("Checking current Bedrock Server version.");
    const builds = await parser.getBedrockVersions();

    if (builds.length === 0) {
      throw new Error("No builds found");
    }

    const windowsBuild = builds.filter((b) => b.platform === "windows");
    if (windowsBuild.length === 0) {
      throw new Error("No compatible builds found.");
    }

    console.log("Installed version: " + currentVersion?.version);
    console.log("Latest windows version:" + windowsBuild[0].version);

    if (windowsBuild[0].version !== currentVersion?.version) {
      console.log("Downloading...");
      await downloader.download(this.configuration?.versionCache || '', windowsBuild[0]);
      console.log("Installing...");
      await installer.install(
        windowsBuild[0],
        this.configuration?.basePath ?? ""
      );
      return true;
    }

    console.log("Current version already downloaded.");
    return false;
  }

  public async start(): Promise<void> {
    await this.update();
    console.log("Starting...");
    this.process = this.runner.start();
  }

  public async stop(): Promise<void> {
    this.runner.stop();
    await this.process;
  }

  public state(): any {
    return {
      pid: this.runner.pid,
      stdout: this.runner.stdout,
      version: this.runner.version(),
    };
  }
}
