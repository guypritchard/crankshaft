import { BedrockDownloadPageParser } from './BedrockDownloadPageParser';
import { BedrockDownloader } from './BedrockDownloader';
import { BedrockInstaller } from './BedrockInstaller';
import { BedrockRunner } from './BedrockRunner';
const baseVersion = './BedrockServer';

export const download = async (): Promise<void> => {
    const parser = new BedrockDownloadPageParser();
    const downloader = new BedrockDownloader();
    const installer = new BedrockInstaller();

    const builds = await parser.getBedrockVersions();

    if (builds.length === 0) {
        throw new Error("No builds found");
    }

    const windowsBuild = builds.filter(b => b.platform === 'windows');
    if (windowsBuild.length === 0) {
        throw new Error("No compatible builds found.");
    }

    await downloader.download(windowsBuild[0]);
    await installer.install(windowsBuild[0], baseVersion);
}