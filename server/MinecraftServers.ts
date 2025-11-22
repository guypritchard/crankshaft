import path from 'path';
import fs from 'fs';
import dgram from 'dgram';
import net from 'net';
import { ServerConfiguration, ServerStatus, MinecraftEdition } from '../interfaces/types.js';
import { BedrockState } from './BedrockState.js';
import { JavaState } from './JavaState.js';
import { JSONFile } from './utils/JSONFile.js';
import { BEDROCK_DEFAULT_PORT, JAVA_DEFAULT_PORT } from './Constants.js';

type LegacyPersistedServer = {
    config?: {
        port?: number;
    };
    port?: number;
};

interface PersistedServer {
    id: number;
    port?: number;
    edition?: MinecraftEdition;
    maxMemoryMb?: number;
}

interface CreateServerOptions {
    port?: number;
    edition?: MinecraftEdition;
    maxMemoryMb?: number;
}

type ManagedServer = {
    edition: MinecraftEdition;
    instance: BedrockState | JavaState;
};

/**
 * This is an extremely naive implementation at this stage...  Persisting state to a file.
 */
export class MinecraftServers {
    private readonly serverList: string = 'servers.json';
    private readonly configPath: string;
    private state: Map<number, ManagedServer> = new Map<number, ManagedServer>();
    private reservedPorts: Set<number> = new Set<number>();

    public constructor(private config: ServerConfiguration) {
        this.configPath = path.join(this.config.basePath, this.serverList);
    }

    private getUsedPorts(): Set<number> {
        return new Set([...this.state.values()].map((server) => server.instance.getPort()));
    }

    private defaultPort(edition: MinecraftEdition): number {
        return edition === MinecraftEdition.Java ? JAVA_DEFAULT_PORT : BEDROCK_DEFAULT_PORT;
    }

    private async findAvailablePort(options?: { requestedPort?: number; edition?: MinecraftEdition }): Promise<number> {
        const edition = options?.edition ?? MinecraftEdition.Bedrock;
        const usedPorts = this.getUsedPorts();
        let candidate = options?.requestedPort ?? this.defaultPort(edition);

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

    private async isUdpAvailable(port: number): Promise<boolean> {
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

    private async isTcpAvailable(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.once('error', () => {
                server.close();
                resolve(false);
            });

            server.listen(port, () => {
                server.close(() => resolve(true));
            });
        });
    }

    private async isPortAvailable(port: number): Promise<boolean> {
        const [tcpFree, udpFree] = await Promise.all([this.isTcpAvailable(port), this.isUdpAvailable(port)]);
        return tcpFree && udpFree;
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
            const assignedPort = await this.findAvailablePort({ requestedPort: server.port, edition: server.edition });
            let managedState: ManagedServer | null = null;

            try {
                const instance = this.createState(server.edition ?? MinecraftEdition.Bedrock, server.id, assignedPort, {
                    maxMemoryMb: server.maxMemoryMb,
                });
                managedState = { edition: server.edition ?? MinecraftEdition.Bedrock, instance };
                this.state.set(server.id, managedState);

                await managedState.instance.start();
            } catch (error) {
                console.error(`Unable to start server ${server.id}:`, error);
                if (managedState != null) {
                    managedState.instance.serverState = ServerStatus.Stopped;
                }
            } finally {
                this.releaseReservedPort(assignedPort);
            }
        });

        await Promise.all(startingServers);
        this.persist();
    }

    public getAll(): Array<[number, ManagedServer]> {
        return [...this.state.entries()];
    }

    private createState(
        edition: MinecraftEdition,
        id: number,
        port: number,
        options?: { maxMemoryMb?: number },
    ): BedrockState | JavaState {
        if (edition === MinecraftEdition.Java) {
            return new JavaState(id, port, this.config, options?.maxMemoryMb);
        }

        return new BedrockState(id, port, this.config);
    }

    public async addNew(id: number, options?: CreateServerOptions): Promise<ManagedServer['instance']> {
        const edition = options?.edition ?? MinecraftEdition.Bedrock;
        const requestedPort = options?.port ?? this.defaultPort(edition);

        if (this.state.get(id) == null) {
            const assignedPort = await this.findAvailablePort({ requestedPort, edition });
            let managedServer: ManagedServer | null = null;

            try {
                const instance = this.createState(edition, id, assignedPort, {
                    maxMemoryMb: options?.maxMemoryMb,
                });
                managedServer = { edition, instance };
                this.state.set(id, managedServer);
                await managedServer.instance.start();
                this.persist();
                return managedServer.instance;
            } catch (error) {
                if (managedServer != null) {
                    this.state.delete(id);
                }
                throw error;
            } finally {
                this.releaseReservedPort(assignedPort);
            }
        } else {
            return this.state.get(id)!.instance;
        }
    }

    public get(id: number): ManagedServer | undefined {
        return this.state.get(id);
    }

    public async remove(id: number): Promise<void> {
        const managedServer = this.state.get(id);
        if (managedServer == null) {
            return;
        }

        if (managedServer.instance.state().state !== ServerStatus.Stopped) {
            throw new Error(`Server ${id} must be stopped before removal.`);
        }

        const serverDirectory = this.getServerDirectory(id);
        await this.deleteServerDirectory(serverDirectory);

        this.state.delete(id);
        this.persist();
    }

    public persist(): void {
        const serializedState = [...this.state.entries()].map(([id, managed]) => {
            const entry: PersistedServer = {
                id,
                edition: managed.edition,
                port: managed.instance.getPort(),
            };

            if (managed.edition === MinecraftEdition.Java && managed.instance instanceof JavaState) {
                entry.maxMemoryMb = managed.instance.getMaxMemoryMb();
            }

            return entry;
        });

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
                edition: MinecraftEdition.Bedrock,
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
                edition: server.edition ?? MinecraftEdition.Bedrock,
                port: typeof server.port === 'number' ? server.port : undefined,
                maxMemoryMb: typeof server.maxMemoryMb === 'number' ? server.maxMemoryMb : undefined,
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
