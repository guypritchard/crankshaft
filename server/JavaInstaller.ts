import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { JavaVersion, MinecraftEdition } from '../interfaces/types.js';
import { JSONFile } from './utils/JSONFile.js';

export class JavaInstaller {
    private async download(url: string, destination: string): Promise<void> {
        const response = await fetch(url);
        if (!response.ok || response.body == null) {
            throw new Error(`Unable to download Java server from ${url}`);
        }

        await fs.promises.mkdir(path.dirname(destination), { recursive: true });

        return new Promise((resolve, reject) => {
            const fileStream = fs.createWriteStream(destination);
            response.body.pipe(fileStream);
            response.body.on('error', reject);
            fileStream.on('finish', resolve);
        });
    }

    private async hashFile(filePath: string): Promise<string | null> {
        try {
            const buffer = await fs.promises.readFile(filePath);
            return crypto.createHash('sha1').update(buffer).digest('hex');
        } catch {
            return null;
        }
    }

    public async install(version: JavaVersion, versionCache: string, basePath: string): Promise<void> {
        const javaCache = path.join(versionCache, 'java');
        const cleanFilename = version.filename.replace(/^java[\s-]*/i, '').replace(/^server-/, 'server-');
        const cachedFile = path.join(javaCache, cleanFilename);

        if (fs.existsSync(javaCache) === false) {
            await fs.promises.mkdir(javaCache, { recursive: true });
        }

        if (fs.existsSync(cachedFile) === false) {
            await this.download(version.url, cachedFile);
        } else if (version.sha1 != null) {
            const hash = await this.hashFile(cachedFile);
            if (hash !== version.sha1) {
                await this.download(version.url, cachedFile);
            }
        }

        await fs.promises.mkdir(basePath, { recursive: true });
        await fs.promises.copyFile(cachedFile, path.join(basePath, 'server.jar'));
        JSONFile.write(path.join(basePath, 'version.json'), {
            ...version,
            build: version.build.replace(/^java[\s-]*/i, ''),
            version: version.version.replace(/^java[\s-]*/i, ''),
            filename: cleanFilename,
            edition: MinecraftEdition.Java,
        });
    }
}
