import fetch from 'node-fetch';
import path from 'path';
import { BedrockVersion, Platform } from '../interfaces/types.js';

interface DownloadLink {
    downloadType: string;
    downloadUrl: string;
}

interface DownloadLinksResponse {
    result?: {
        links?: DownloadLink[];
    };
}

export class BedrockDownloadPageParser {
    private static readonly DownloadLinksUrl =
        'https://net-secondary.web.minecraft-services.net/api/v1.0/download/links';
    private static readonly SupportedDownloads: Record<string, Platform> = {
        serverBedrockWindows: 'windows',
        serverBedrockLinux: 'linux',
    };

    public async getBedrockVersions(): Promise<BedrockVersion[]> {
        console.log('Fetching download links JSON.');

        try {
            const result = await fetch(BedrockDownloadPageParser.DownloadLinksUrl, {
                method: 'GET',
                headers: { 'User-Agent': 'crankshaft/bedrock-downloader' },
            });

            if (result.ok === false) {
                console.log('Unable to download Bedrock download links.');
                return [];
            }

            const json = (await result.json()) as DownloadLinksResponse;
            const links = json?.result?.links ?? [];

            const versions = links
                .filter((link) => BedrockDownloadPageParser.SupportedDownloads[link.downloadType] != null)
                .map((link) => this.mapLinkToVersion(link))
                .filter((version): version is BedrockVersion => version != null);

            if (versions.length === 0) {
                console.log('No minecraft version data found.');
                return [];
            }

            console.log(`Found ${versions.length} published versions.`);
            return versions;
        } catch (error) {
            console.log('Failed to fetch Bedrock download links.');
            console.log(error);
            return [];
        }
    }

    private mapLinkToVersion(link: DownloadLink): BedrockVersion | null {
        const platform = BedrockDownloadPageParser.SupportedDownloads[link.downloadType];
        if (platform == null) {
            return null;
        }

        const filename = path.basename(new URL(link.downloadUrl).pathname);
        const build = this.extractBuildFromFilename(filename) ?? 'unknown';

        return {
            build: build,
            version: build,
            url: link.downloadUrl,
            platform,
            filename,
        };
    }

    private extractBuildFromFilename(filename: string): string | null {
        const buildMatch = filename.match(/bedrock-server-([\d.]+)\.zip/i);
        return buildMatch?.[1] ?? null;
    }
}
