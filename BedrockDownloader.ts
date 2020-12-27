import { BedrockVersion } from "./BedrockVersion";
import fs from 'fs';
import fetch from "node-fetch";

export class BedrockDownloader {
    public async download(version: BedrockVersion): Promise<void> {
        const download = await fetch(version.url);

        const p = new Promise((resolve, reject) => {
            const dest = fs.createWriteStream(`./${version.filename}`, { flags: 'w'});
            download.body.pipe(dest);
            // download.body.on("end", resolve);
            dest.on("error", reject)
                .on('finish', resolve);

        });

        await p;
    }
}
