import path from 'path';
import fs from 'fs';
import dgram from 'dgram';
import { ServerConfiguration, ServerStatus } from '../interfaces/types';
import { BedrockState } from './BedrockState';
import { JSONFile } from './utils/JSONFile';
import { BEDROCK_DEFAULT_PORT } from './Constants';

type LegacyPersistedServer = {
    config?: {
        port?: number;
    };
    port?: number;
};

interface PersistedServer {
    id: number;
    port?: number;
}

/**
 * This is an extremely naive implementation at this stage...  Persisting state to a file.
 */
export class BedrockServers {
    private readonly serverList: string = 'servers.json';
    private readonly configPath: string;
    private state: Map<number, BedrockState> = new Map<number, BedrockState>();
    private reservedPorts: Set<number> = new Set<number>();

    public constructor(private config: ServerConfiguration) {
        this.configPath = path.join(this.config.basePath, this.serverList);
    }

    private getUsedPorts(): Set<number> {
        return new Set([...this.state.values()].map((server) => server.getPort()));
    }

    private async findAvailablePort(requestedPort?: number): Promise<number> {
        const usedPorts = this.getUsedPorts();
        let candidate = requestedPort ?? BEDROCK_DEFAULT_PORT;

        while (true) {
            if (usedPorts.has(candidate) || this.reservedPorts.has(candidate)) {
                candidate += 1;
                continue;
            }

            const isFree = await this.isPortAvailable(candidate);
            if (isFree) {
                this.reservedPorts.add(candidate);
                return candidate;
            }

            candidate += 1;
        }
    }

    private async isPortAvailable(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const socket = dgram.createSocket('udp4');

            const cleanup = (): void => {
                socket.removeAllListeners();
                try {
                    socket.close();
                } catch {
                    // Ignore close errors
                }
            };

            socket.once('error', () => {
                cleanup();
                resolve(false);
            });

            socket.bind(port, () => {
                cleanup();
                resolve(true);
            });
        });
    }

    private releaseReservedPort(port: number): void {
        this.reservedPorts.delete(port);
    }

    public async init(): Promise<void> {
        const persistedServers = this.loadPersistedServers();
        if (persistedServers.length === 0) {
            console.log('No existing server configuration found. Waiting for servers to be created.');
            this.persist();
            return;
        }

        console.log(`Found: ${persistedServers.length} servers in config.`);
        const startingServers = persistedServers.map(async (server) => {
            const assignedPort = await this.findAvailablePort(server.port);
            let bedrockState: BedrockState | null = null;

            try {
                bedrockState = new BedrockState(server.id, assignedPort, this.config);
                this.state.set(server.id, bedrockState);

                await bedrockState.start();
            } catch (error) {
                console.error(`Unable to start server ${server.id}:`, error);
                if (bedrockState != null) {
                    bedrockState.serverState = ServerStatus.Stopped;
                }
            } finally {
                this.releaseReservedPort(assignedPort);
            }
        });

        await Promise.all(startingServers);
        this.persist();
    }

    public getAll(): Array<[number, BedrockState]> {
        return [...this.state.entries()];
    }

    public async addNew(id: number, port: number = BEDROCK_DEFAULT_PORT): Promise<BedrockState> {
        if (this.state.get(id) == null) {
            const assignedPort = await this.findAvailablePort(port);
            let bedrockState: BedrockState | null = null;

            try {
                bedrockState = new BedrockState(id, assignedPort, this.config);
                this.state.set(id, bedrockState);
                await bedrockState.start();
                this.persist();
                return bedrockState;
            } catch (error) {
                if (bedrockState != null) {
                    this.state.delete(id);
                }
                throw error;
            } finally {
                this.releaseReservedPort(assignedPort);
            }
        } else {
            return this.state.get(id)!;
        }
    }

    public get(id: number): BedrockState | undefined {
        return this.state.get(id);
    }

    public async remove(id: number): Promise<void> {
        const state = this.state.get(id);
        if (state == null) {
            return;
        }

        if (state.state().state !== ServerStatus.Stopped) {
            throw new Error(`Server ${id} must be stopped before removal.`);
        }

        const serverDirectory = this.getServerDirectory(id);
        await this.deleteServerDirectory(serverDirectory);

        this.state.delete(id);
        this.persist();
    }

    public persist(): void {
        const serializedState = [...this.state.entries()].map(([id, state]) => ({
            id,
            port: state.getPort(),
        }));

        JSONFile.write(this.configPath, serializedState);
    }

    private loadPersistedServers(): PersistedServer[] {
        if (JSONFile.exists(this.configPath) === false) {
            return [];
        }

        const rawServers = JSONFile.read<unknown>(this.configPath);
        if (!Array.isArray(rawServers)) {
            return [];
        }

        const parsedServers = rawServers
            .map((entry) => this.parsePersistedEntry(entry))
            .filter((entry): entry is PersistedServer => entry != null);

        return parsedServers;
    }

    private parsePersistedEntry(entry: unknown): PersistedServer | null {
        if (Array.isArray(entry)) {
            const [id, state] = entry;
            if (typeof id !== 'number') {
                return null;
            }

            return {
                id,
                port: this.resolvePersistedPort(state as LegacyPersistedServer),
            };
        }

        if (typeof entry === 'object' && entry != null) {
            const server = entry as PersistedServer;
            if (typeof server.id !== 'number') {
                return null;
            }

            return {
                id: server.id,
                port: typeof server.port === 'number' ? server.port : undefined,
            };
        }

        return null;
    }

    private resolvePersistedPort(state?: LegacyPersistedServer): number | undefined {
        if (state?.config?.port != null) {
            return state.config.port;
        }

        if (typeof state?.port === 'number') {
            return state.port;
        }

        return undefined;
    }

    private getServerDirectory(id: number): string {
        return path.join(this.config.basePath, id.toString());
    }

    private async deleteServerDirectory(directory: string): Promise<void> {
        if (fs.existsSync(directory)) {
            await fs.promises.rm(directory, { recursive: true, force: true });
        }
    }
}
