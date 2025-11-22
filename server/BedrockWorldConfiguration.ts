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
    public onlineMode: boolean = true;
    public contentLogConsoleOutputEnabled: boolean = true;
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

        this.setConfigValue('server-port', port.toString());
        this.setConfigValue('server-portv6', (port + 1).toString());
        this.port = port;
        this.save();
    }

    public setMode(mode: BedrockMode | string): void {
        console.log(`Setting game mode to: ${mode}`);

        this.serverConfiguration = this.serverConfiguration.replace(
            new RegExp(this.mode.toString(), 'g'),
            mode.toString(),
        );
        this.mode = mode.toString();
        this.save();
    }

    public setOnlineMode(onlineMode: boolean): void {
        console.log(`Setting online-mode to: ${onlineMode}`);

        this.setConfigValue('online-mode', onlineMode ? 'true' : 'false');
        this.onlineMode = onlineMode;
        this.save();
    }

    public setContentLogConsoleOutputEnabled(enabled: boolean): void {
        console.log(`Setting content-log-console-output-enabled to: ${enabled}`);

        this.setConfigValue('content-log-console-output-enabled', enabled ? 'true' : 'false');
        this.contentLogConsoleOutputEnabled = enabled;
        this.save();
    }

    public enableDetailedTelemetry(): void {
        console.log(`Enabling server telemetry`);

        this.setConfigValue('emit-server-telemetry', 'true');
        this.save();
    }

    private get fileName(): string {
        return path.join(this.basePath, 'server.properties');
    }

    constructor(private basePath: string) {
        this.parse();
        this.ensureContentLogConsoleOutput();
        this.enableDetailedTelemetry();
        this.worlds = this.loadWorlds();
    }

    public refreshWorlds(): void {
        this.worlds = this.loadWorlds();
    }

    private loadWorlds(): string[] {
        try {
            return fs.readdirSync(path.join(this.basePath, 'worlds'));
        } catch {
            return [];
        }
    }

    private parse(): string {
        try {
            this.serverConfiguration = fs.readFileSync(this.fileName, {
                encoding: 'utf8',
                flag: 'r',
            });
        } catch {}

        if (this.serverConfiguration != null) {
            const world = this.getConfigValue('level-name');
            const portValue = this.getConfigValue('server-port');
            const mode = this.getConfigValue('gamemode');
            const onlineMode = this.getConfigValue('online-mode');
            const contentLogConsoleOutput = this.getConfigValue('content-log-console-output-enabled');

            if (world !== '') {
                this.world = world;
            }

            const parsedPort = parseInt(portValue);
            if (!isNaN(parsedPort)) {
                this.port = parsedPort;
            }

            if (mode !== '') {
                this.mode = mode;
            }

            if (onlineMode !== '') {
                this.onlineMode = onlineMode.toLowerCase() === 'true';
            }

            if (contentLogConsoleOutput !== '') {
                this.contentLogConsoleOutputEnabled = contentLogConsoleOutput.toLowerCase() === 'true';
            }
        }

        return '';
    }

    private ensureContentLogConsoleOutput(): void {
        const current = this.getConfigValue('content-log-console-output-enabled');
        if (current === '') {
            this.setContentLogConsoleOutputEnabled(true);
        } else {
            this.contentLogConsoleOutputEnabled = current.toLowerCase() === 'true';
        }
    }

    private getConfigValue(config: string): string {
        const configStart = config + '=';
        const startIndex = this.serverConfiguration.indexOf(configStart);
        if (startIndex === -1) {
            return '';
        }

        const start = startIndex + configStart.length;
        const end = this.serverConfiguration.indexOf('\r\n', start);

        if (end === -1) {
            return this.serverConfiguration.slice(start);
        }

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

    private setConfigValue(key: string, value: string): void {
        const configStart = `${key}=`;
        const escaped = this.escapeRegExp(configStart);
        const regex = new RegExp(`^${escaped}.*$`, 'm');

        if (regex.test(this.serverConfiguration)) {
            this.serverConfiguration = this.serverConfiguration.replace(regex, `${configStart}${value}`);
        } else {
            if (this.serverConfiguration.length > 0 && this.serverConfiguration.endsWith('\r\n') === false) {
                this.serverConfiguration += '\r\n';
            }

            this.serverConfiguration += `${configStart}${value}\r\n`;
        }
    }

    private escapeRegExp(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
