import fetch from 'node-fetch';
import { JavaVersion, MinecraftEdition } from '../interfaces/types.js';

type VersionManifest = {
    latest: { release: string; snapshot: string };
    versions: Array<{ id: string; url: string }>;
};

type VersionDetail = {
    id: string;
    downloads?: {
        server?: {
            url: string;
            sha1?: string;
        };
    };
};

export class JavaVersionFetcher {
    private readonly manifestUrl = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';

    private async readJson<T>(url: string): Promise<T> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Unable to fetch ${url}: ${response.status}`);
        }

        return (await response.json()) as T;
    }

    public async getLatestRelease(): Promise<JavaVersion> {
        const manifest = await this.readJson<VersionManifest>(this.manifestUrl);
        const latestId = manifest.latest?.release ?? manifest.versions[0]?.id;

        if (latestId == null) {
            throw new Error('No Java release versions found.');
        }

        const targetVersion = manifest.versions.find((entry) => entry.id === latestId) ?? manifest.versions[0];
        const versionDetail = await this.readJson<VersionDetail>(targetVersion.url);
        const serverDownload = versionDetail.downloads?.server;

        if (serverDownload == null) {
            throw new Error('No Java server download found in manifest.');
        }

        const cleanId = targetVersion.id.replace(/^java[\s-]*/i, '');

        return {
            edition: MinecraftEdition.Java,
            build: versionDetail.id?.replace(/^java[\s-]*/i, '') ?? cleanId,
            version: cleanId,
            url: serverDownload.url,
            filename: `server-${cleanId}.jar`,
            sha1: serverDownload.sha1,
        };
    }
}
