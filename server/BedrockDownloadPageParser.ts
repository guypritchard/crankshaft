import * as $ from 'cheerio';
import fetch from 'node-fetch';
import { BedrockVersion } from './BedrockVersion';
import * as url from 'url';
import * as path from 'path';

export class BedrockDownloadPageParser {
    static readonly Url = 'https://minecraft.net/en-us/download/server/bedrock/';
    static readonly PartialFileName = 'bedrock-server-';

    public async getBedrockVersions(): Promise<BedrockVersion[]> {
        const result = await fetch(BedrockDownloadPageParser.Url);

        if (result.ok === false) {
            return [];
        }

        const html = await result.text();

        const linkObjects: cheerio.Cheerio = $('a', html);
        const total = linkObjects.length;

        if (total === 0) {
            return [];
        }

        const links: string[] = [];
        linkObjects.each((i, element) => {
            links.push((element as cheerio.TagElement).attribs.href as string);
        });

        const minecraftFullLink = links.filter((l) => l && l.indexOf(BedrockDownloadPageParser.PartialFileName) !== -1);

        if (minecraftFullLink.length == 0) {
            return [];
        }

        const minecraftData = minecraftFullLink.map((l) => {
            let minecraftVersion = l.slice(BedrockDownloadPageParser.PartialFileName.length);
            minecraftVersion = minecraftVersion.slice(0, minecraftVersion.lastIndexOf('.'));

            return {
                version: minecraftVersion,
                url: l,
                platform: l.indexOf('win') === -1 ? 'linux' : 'windows',
                filename: path.basename(url.parse(l).pathname as string),
            } as BedrockVersion;
        });

        return minecraftData ?? [];
    }
}
