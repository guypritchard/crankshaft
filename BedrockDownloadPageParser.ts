import $ from 'cheerio';
import fetch from 'node-fetch';
import { BedrockVersion } from "./BedrockVersion";
import url from "url";
import path from "path";

export class BedrockDownloadPageParser {
    static readonly Url = 'https://minecraft.net/en-us/download/server/bedrock/';
    static readonly PartialFileName = 'bedrock-server-';

    public async getBedrockVersions(): Promise<BedrockVersion[]> {

        const result = await fetch(BedrockDownloadPageParser.Url);

        if (result.ok === false) {
            return [];
        }

        const html = await result.text();

        const linkObjects = $('a', html);
        // this is a mass object, not an array

        const total = linkObjects.length;

        if (total === 0) {
            return [];
        }

        const links = [];
        for (let i = 0; i < total; i++) {
            links.push({
                href: linkObjects[i].attribs.href as string,
                title: linkObjects[i].attribs.title
            });
        }

        const minecraftFullLink = links.filter(l => l.href && l.href.indexOf(BedrockDownloadPageParser.PartialFileName) !== -1);

        if (minecraftFullLink.length == 0) {
            return [];
        }

        const minecraftData = minecraftFullLink.map(l => {
            let minecraftVersion = l.href.slice(BedrockDownloadPageParser.PartialFileName.length);
            minecraftVersion = minecraftVersion.slice(0, minecraftVersion.lastIndexOf('.'));

            return {
                version: minecraftVersion,
                url: l.href,
                platform: l.href.indexOf('win') === -1 ? 'linux' : 'windows',
                filename: path.basename(url.parse(l.href).pathname as string),
            } as BedrockVersion;
        });

        return minecraftData ?? [];
    }
}