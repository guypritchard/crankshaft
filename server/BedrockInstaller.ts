import unzipper from 'unzipper';
import fs from 'fs';
import path from 'path';
import { JSONFile } from './utils/JSONFile.js';
import { BedrockVersion } from '../interfaces/types.js';

export class BedrockInstaller {
    public async install(version: BedrockVersion, versionCache: string, basePath: string): Promise<void> {
        const p = new Promise((resolve, reject) => {
            fs.createReadStream(path.join(versionCache, version.filename))
                .pipe(unzipper.Parse())
                .on('entry', function (entry) {
                    const fileName = entry.path;
                    const type = entry.type; // 'Directory' or 'File'
                    if (type === 'File') {
                        entry.pipe(fs.createWriteStream(path.join(basePath, fileName), { flags: 'w' }));
                    } else {
                        if (!fs.existsSync(path.join(basePath, entry.path))) {
                            fs.mkdirSync(path.join(basePath, entry.path), { recursive: true });
                        }
                    }
                })
                .on('error', reject)
                .on('finish', resolve)
                .on('finish', () => {
                    JSONFile.write(path.join(basePath, 'version.json'), version);
                });
        });

        await p;
    }
}
