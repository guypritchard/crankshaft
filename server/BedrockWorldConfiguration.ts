import * as fs from 'fs';
import * as path from 'path';
import { WorldConfiguration } from '../interfaces/types';

export class BedrockWorldConfiguration implements WorldConfiguration {
    public world = '';
    public worlds: string[] = [];
    private serverConfiguration = '';

    public setCurrentWorld(name: string): void {
        this.serverConfiguration.replace(this.world, name);
        this.world = name;
        this.save();
    }

    private get fileName(): string {
        return path.join(this.basePath, 'server.properties');
    }

    constructor(private basePath: string) {
        this.parse();
        this.worlds = this.loadWorlds(basePath);
    }

    private loadWorlds(basePath: string): string[] {
        return fs.readdirSync(path.join(basePath, 'worlds'));
    }

    private parse(): string {
        this.serverConfiguration = fs.readFileSync(this.fileName, {
            encoding: 'utf8',
            flag: 'r',
        });

        if (this.serverConfiguration != null) {
            const worldName = 'level-name=';
            const start = this.serverConfiguration.indexOf(worldName) + worldName.length;
            const end = this.serverConfiguration.indexOf('\r\n', start);
            this.world = this.serverConfiguration.slice(start, end);
        }

        return '';
    }

    private save(): void {
        if (this.serverConfiguration != null) {
            fs.writeFileSync(this.fileName, this.serverConfiguration, {
                encoding: 'utf8',
                flag: 'w',
            });
        }
    }
}
