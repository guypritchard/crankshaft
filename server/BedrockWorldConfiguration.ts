import * as fs from 'fs';
import * as path from 'path';

export class BedrockWorldConfiguration {
    private worldName = '';
    private serverConfiguration = '';

    public get world(): string {
        return this.worldName;
    }

    public set world(name: string) {
        this.serverConfiguration.replace(this.worldName, name);
        this.worldName = name;
        this.save();
    }

    private get fileName(): string {
        return path.join(this.basePath, 'server.properties');
    }

    constructor(private basePath: string) {
        this.parse();
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
            this.worldName = this.serverConfiguration.slice(start, end);
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
