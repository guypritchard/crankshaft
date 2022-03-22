import * as fs from 'fs';
import fetch from 'node-fetch';
import * as path from 'path';
import { BedrockVersion } from '../interfaces/types.js';

export class BedrockDownloader {
    public async download(versionCache: string, version: BedrockVersion): Promise<void> {
        if (fs.existsSync(versionCache) === false) {
            fs.mkdirSync(versionCache, { recursive: true });
        }

        if (fs.existsSync(path.join(versionCache, version.filename))) {
            console.log('Found current version - skipping download.');
            return;
        }

        console.log('Downloading...');
        const download = await fetch(version.url);

        if (download.ok){
          const downloading = new Promise((resolve, reject) => {
            const dest = fs.createWriteStream(path.join(versionCache, version.filename), {
              flags: 'w',
            });

            if (download.body != null) {
              download.body.pipe(dest);
              dest.on('error', reject).on('finish', resolve);
            } else {
              throw new Error(`No data returned from: ${version.url}`);
            }
          });

          await downloading;
        } else {
          throw new Error(`Unable to download bedrock package: ${version.url}`);
        }
    }
}
