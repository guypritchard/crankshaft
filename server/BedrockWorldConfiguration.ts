import * as fs from 'fs';
import * as path from 'path';
import { BedrockMode, WorldConfiguration } from '../interfaces/types';
import { BEDROCK_DEFAULT_PORT } from './Constants';

export class BedrockWorldConfiguration implements WorldConfiguration {
    public world = '';
    public worlds: string[] = [];
    public mode: string = '';
    public port: number = BEDROCK_DEFAULT_PORT;
    public telemetry: boolean = true;
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
      console.log(`Replacing ${this.port.toString()} with ${port.toString()}`);

      this.serverConfiguration = this.serverConfiguration.replace(new RegExp(this.port.toString(), 'g'), port.toString());
      this.port = port;
      this.save();
    }

    public setMode(mode: BedrockMode | string): void {
        console.log(`Setting game mode to: ${mode}`);
        
        this.serverConfiguration = this.serverConfiguration.replace(new RegExp(this.mode.toString(), 'g'), mode.toString());
        this.mode = mode.toString()
        this.save();
    }

    public enableDetailedTelemetry() : void {
        console.log(`Enabling server telemetry`);

        if (this.serverConfiguration.indexOf("emit-server-telemetry") === -1)
        {
            this.serverConfiguration += "\r\nemit-server-telemetry=true\r\n";
        }

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
            this.mode = this.getConfigValue('gamemode');
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
