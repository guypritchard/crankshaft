import * as fs from 'fs';
import * as path from 'path';
import { WorldConfiguration } from '../interfaces/types';

export class BedrockWorldConfiguration implements WorldConfiguration {
    public world = '';
    public worlds: string[] = [];
    public port: number = 19132;
    private serverConfiguration = '';

    public setCurrentWorld(name: string): void {

        this.serverConfiguration = this.serverConfiguration.replace(new RegExp(this.world, 'g'), name);
        this.world = name;
        this.save();
    }

    /**
     * Set the port the Bedrock server runs on.
     * @param port 
     * None of this port stuff works - the base Bedrock image has a long standing bug which means it still binds to the default
     * port - preventing multiple servers to be run natively.
     * https://bugs.mojang.com/browse/BDS-1094
     */
    public setPort(port: number): void {
      console.log(`replacing ${this.port.toString()} with ${port.toString()}, ${this.serverConfiguration}`)

      this.serverConfiguration = this.serverConfiguration.replace(new RegExp(this.port.toString(), 'g'), port.toString());
      this.port = port;
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
        try {
            return fs.readdirSync(path.join(basePath, 'worlds'));
        } catch (error) {
            return [];
        }
    }

    private parse(): string {
        try {
            this.serverConfiguration = fs.readFileSync(this.fileName, {
                encoding: 'utf8',
                flag: 'r',
            });
        } catch (error) {}

        if (this.serverConfiguration != null) {
            this.world = this.getConfigValue('level-name');
            this.port = parseInt(this.getConfigValue('server-port'));
        }

        return '';
    }

    private getConfigValue(config: string): string {
      const configStart = config +'=';
      const start = this.serverConfiguration.indexOf(configStart) + configStart.length;
      const end = this.serverConfiguration.indexOf('\r\n', start);
      return this.serverConfiguration.slice(start, end);
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
