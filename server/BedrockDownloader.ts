import { BedrockVersion } from './BedrockVersion';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';

export class BedrockDownloader {
    public async download(versionCache: string, version: BedrockVersion): Promise<void> {
        if (!fs.existsSync(versionCache)) {
            fs.mkdirSync(versionCache, { recursive: true });
        }

        const download = await fetch(version.url);

        const downloading = new Promise((resolve, reject) => {
            const dest = fs.createWriteStream(path.join(versionCache, version.filename), {
                flags: 'w',
            });
            download.body.pipe(dest);
            dest.on('error', reject).on('finish', resolve);
        });

        await downloading;
    }
}
