import path from 'path';
import fs from 'fs';
import { ServerConfiguration, ServerState, ServerStatus, MinecraftEdition, BedrockMode } from '../interfaces/types.js';
import { JavaRunner } from './JavaRunner.js';
import { JavaInstaller } from './JavaInstaller.js';
import { JavaVersionFetcher } from './JavaVersionFetcher.js';
import { JAVA_DEFAULT_PORT } from './Constants.js';
import { JavaLanBeacon } from './JavaLanBeacon.js';

export class JavaState {
    private readonly path: string;
    private readonly maxMemoryMb: number;
    private runner: JavaRunner;
    private process: Promise<void> = Promise.resolve();
    public serverState: ServerStatus = ServerStatus.Unknown;
    private beacon: JavaLanBeacon = new JavaLanBeacon();
    private motd: string = 'Crankshaft Java Server';
    private mode: BedrockMode | string = BedrockMode.survival;

    constructor(
        private id: number = 0,
        private port: number = JAVA_DEFAULT_PORT,
        private configuration: ServerConfiguration,
        maxMemoryMb: number = 2048,
    ) {
        this.path = path.join(this.configuration?.basePath, this.id.toString(), 'java');
        this.maxMemoryMb = maxMemoryMb;
        this.runner = new JavaRunner(this.path, this.maxMemoryMb);
    }

    public getPort(): number {
        return this.port;
    }

    public getMaxMemoryMb(): number {
        return this.maxMemoryMb;
    }

    private async install(): Promise<boolean> {
        const fetcher = new JavaVersionFetcher();
        const installer = new JavaInstaller();

        console.log('Checking current Java Server version.');
        const build = await fetcher.getLatestRelease();

        try {
            await installer.install(build, this.configuration?.versionCache || '', this.path);
            return true;
        } catch (error) {
            console.error('Unable to install Java server build', error);
            return false;
        }
    }

    private async ensureEulaAccepted(): Promise<void> {
        const eulaPath = path.join(this.path, 'eula.txt');
        await fs.promises.mkdir(this.path, { recursive: true });
        await fs.promises.writeFile(eulaPath, 'eula=true\n');
    }

    private async readProperties(): Promise<Map<string, string>> {
        const propertiesPath = path.join(this.path, 'server.properties');
        const properties = new Map<string, string>();

        if (fs.existsSync(propertiesPath)) {
            const content = await fs.promises.readFile(propertiesPath, 'utf8');
            content
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter((line) => line.length > 0 && line.startsWith('#') === false)
                .forEach((line) => {
                    const [key, ...rest] = line.split('=');
                    if (key != null && rest.length > 0) {
                        properties.set(key, rest.join('='));
                    }
                });
        }

        return properties;
    }

    private async writeProperties(properties: Map<string, string>): Promise<void> {
        const propertiesPath = path.join(this.path, 'server.properties');
        const lines: string[] = [];
        properties.forEach((value, key) => {
            lines.push(`${key}=${value}`);
        });

        await fs.promises.mkdir(this.path, { recursive: true });
        await fs.promises.writeFile(propertiesPath, lines.join('\n'), 'utf8');
    }

    private async ensureServerProperties(options?: {
        onlineMode?: boolean;
        mode?: BedrockMode | string;
    }): Promise<void> {
        const properties = await this.readProperties();
        const resolvedOnlineMode =
            options?.onlineMode ?? (properties.get('online-mode')?.toLowerCase() !== 'false' ? true : false);

        properties.set('server-port', this.port.toString());
        properties.set('online-mode', resolvedOnlineMode ? 'true' : 'false');
        this.motd = properties.get('motd') ?? 'Crankshaft Java Server';
        properties.set('motd', this.motd);
        const resolvedMode = options?.mode ?? properties.get('gamemode') ?? BedrockMode.survival;
        this.mode = resolvedMode;
        properties.set('gamemode', this.mode.toString());

        await this.writeProperties(properties);
    }

    private getOnlineMode(): boolean {
        const propertiesPath = path.join(this.path, 'server.properties');
        if (fs.existsSync(propertiesPath) === false) {
            return true;
        }

        try {
            const content = fs.readFileSync(propertiesPath, 'utf8');
            const onlineModeLine = content.split(/\r?\n/).find((line) => line.toLowerCase().startsWith('online-mode='));
            return onlineModeLine == null ? true : !onlineModeLine.toLowerCase().includes('false');
        } catch {
            return true;
        }
    }

    public async setOnlineMode(onlineMode: boolean): Promise<ServerState> {
        const wasRunning = this.serverState === ServerStatus.Running;
        if (wasRunning) {
            await this.stop();
        }

        await this.ensureServerProperties({ onlineMode });

        if (wasRunning) {
            await this.start();
        }

        return this.state();
    }

    public async update(): Promise<boolean> {
        const currentVersion = this.runner.version();
        const fetcher = new JavaVersionFetcher();
        const installer = new JavaInstaller();

        console.log('Checking current Java Server version.');
        const latestBuild = await fetcher.getLatestRelease();

        const needsInstall = currentVersion?.build !== latestBuild.build;
        if (!needsInstall) {
            console.log('Current Java version already installed.');
            return false;
        }

        const wasRunning = this.serverState === ServerStatus.Running;
        if (wasRunning) {
            await this.stop();
        }

        await installer.install(latestBuild, this.configuration?.versionCache || '', this.path);

        if (wasRunning) {
            await this.start();
        }

        return true;
    }

    public async start(): Promise<void> {
        const isInstalled = await this.install();
        if (!isInstalled) {
            throw new Error('Unable to install Java server runtime.');
        }

        await this.ensureEulaAccepted();
        await this.ensureServerProperties();

        this.serverState = ServerStatus.Running;
        this.beacon.start(this.motd, this.port);
        this.process = this.runner
            .start()
            .then(() => {
                if (this.serverState === ServerStatus.Running) {
                    this.serverState = ServerStatus.Stopped;
                }
            })
            .catch((error) => {
                console.error(`Java server ${this.id} encountered an error:`, error);
                this.serverState = ServerStatus.Stopped;
            });
    }

    public async stop(): Promise<void> {
        this.runner.stop();
        this.beacon.stop();
        await this.process;
        this.serverState = ServerStatus.Stopped;
    }

    public async backup(): Promise<void> {
        throw new Error('Backups are not implemented for Java edition yet.');
    }

    public state(): ServerState {
        return {
            edition: MinecraftEdition.Java,
            state: this.serverState,
            pid: this.runner.pid,
            stdout: this.runner.stdout,
            version: this.runner.version(),
            crankShaftConfig: this.configuration,
            bedrockConfig: null,
            javaConfig: {
                port: this.port,
                maxMemoryMb: this.maxMemoryMb,
                eulaAccepted: true,
                jar: JavaRunner.serverJar,
                onlineMode: this.getOnlineMode(),
                mode: this.mode,
            },
            exitCode: this.runner.lastExitCode,
        };
    }
}
