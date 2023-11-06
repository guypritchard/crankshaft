import cheerio from 'cheerio';
import fetch from 'node-fetch';
import url from 'url';
import path from 'path';
import { BedrockVersion } from '../interfaces/types.js';

export class BedrockDownloadPageParser {
    static readonly Url = 'https://www.minecraft.net/en-us/download/server/bedrock';
    static readonly PartialFileName = 'bedrock-server-';

    public async getBedrockVersions(): Promise<BedrockVersion[]> {
        console.log("Fetching download page.");  

        const result = await fetch(BedrockDownloadPageParser.Url, { method: 'GET', headers: { 'User-Agent': "test/agent"} }); 
        if (result.ok === false) {
            console.log("Unable to download Bedrock download page.");
            return [];
        }
        const html = await result.text();
        const $ = cheerio.load(html);
        const linkObjects = $('a');
        const total = linkObjects.length;

        if (total === 0) {
            console.log("No download links found on the download page.");
            return [];
        }

        const links: string[] = [];
        linkObjects.each((i: number, element: any) => {
            links.push((element).attribs.href as string);
        });

        const minecraftFullLink = links.filter((l) => l && l.indexOf(BedrockDownloadPageParser.PartialFileName) !== -1);

        if (minecraftFullLink.length == 0) {
            console.log("Bedrock package not found.");
            return [];
        }

        const minecraftData = minecraftFullLink.map((l) => {
            let minecraftVersion = l.slice(BedrockDownloadPageParser.PartialFileName.length);
            minecraftVersion = minecraftVersion.slice(0, minecraftVersion.lastIndexOf('.'));

            const filename = path.basename(url.parse(l).pathname as string);
            const baseVersionRegEx = /(\d+\.)(\d+\.)(\d+\.)(\d+)/;
            const match = filename.match(baseVersionRegEx);

            return {
                version: minecraftVersion,
                build: match?.length ? match[0] : 'unknown',
                url: l,
                platform: l.indexOf('win') === -1 ? 'linux' : 'windows',
                filename: filename,
            } as BedrockVersion;
        });

        
        if (minecraftData && minecraftData.length) {
          console.log(`Current version is ${minecraftData[0].version}`);
          return minecraftData;
        }

        console.log("No minecraft version data found.");
        return [];
    }
}
