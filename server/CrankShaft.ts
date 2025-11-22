import { BedrockDownloadPageParser } from './BedrockDownloadPageParser';
import express from 'express';
import { MinecraftEdition, ServerConfiguration, ServerState, ServerStatus } from '../interfaces/types.js';
import { MinecraftServers } from './MinecraftServers.js';
import { BedrockState } from './BedrockState.js';

export class CrankShaft {
    private readonly serversState: MinecraftServers;

    constructor(app: express.Express, configuration: ServerConfiguration) {
        this.serversState = new MinecraftServers(configuration);

        app.get('/servers', (request, response) => {
            response.send(
                this.serversState.getAll().map(([id, server]) => {
                    return { id, state: server.instance.state() };
                }),
            );
        });

        app.post('/servers/:id', (request, response) => {
            const id = parseInt(request.params.id);
            if (isNaN(id)) {
                return response.status(400);
            }

            const state = this.serversState.get(id);
            if (state != null) {
                response.status(409).send();
                return;
            }

            const portRequest: { port?: number; edition?: string; maxMemoryMb?: number } = request.body;
            const normalizedEdition =
                typeof portRequest?.edition === 'string' && portRequest.edition.toLowerCase() === MinecraftEdition.Java
                    ? MinecraftEdition.Java
                    : MinecraftEdition.Bedrock;

            this.serversState
                .addNew(id, {
                    port: portRequest.port,
                    edition: normalizedEdition,
                    maxMemoryMb: typeof portRequest.maxMemoryMb === 'number' ? portRequest.maxMemoryMb : undefined,
                })
                .then((added) => response.send(added.state()))
                .catch((error) => {
                    console.error(`Unable to create server ${id}:`, error);
                    response.status(500).send('Unable to create server.');
                });
        });

        app.get('/servers/:id', (request, response) => {
            const id = parseInt(request.params.id);
            if (isNaN(id)) {
                response.status(400).send();
                return;
            }

            const state = this.serversState.get(id);
            if (state == null) {
                response.status(404).send();
                return;
            }

            response.send(state.instance.state());
        });

        app.get('/servers/:id/stdout', (request, response) => {
            const id = parseInt(request.params.id);
            if (isNaN(id)) {
                response.status(400).send();
                return;
            }

            const state = this.serversState.get(id);
            if (state == null) {
                response.status(404).send();
                return;
            }

            response.send(state.instance.state()?.stdout);
        });

        app.post('/servers/:id/commands/update', (request, response) => {
            const id = parseInt(request.params.id);
            if (isNaN(id)) {
                response.status(400).send();
                return;
            }

            const state = this.serversState.get(id);
            if (state == null) {
                response.status(404).send();
                return;
            }

            state.instance
                .update()
                .then(() => response.send(state.instance.state()))
                .catch((error) => {
                    console.error(`Unable to update server ${id}:`, error);
                    response.status(500).send('Unable to update server.');
                });
        });

        app.post('/servers/:id/commands/stop', (request, response) => {
            const id = parseInt(request.params.id);
            if (isNaN(id)) {
                response.status(400).send();
                return;
            }

            const state = this.serversState.get(id);
            if (state == null) {
                response.status(404).send();
                return;
            }

            state.instance.stop().then(() => response.send(state.instance.state()));
        });

        app.post('/servers/:id/commands/start', (request, response) => {
            const id = parseInt(request.params.id);
            if (isNaN(id)) {
                response.status(400).send();
                return;
            }

            const state = this.serversState.get(id);
            if (state == null) {
                response.status(404).send();
                return;
            }

            state.instance.start().then(() => response.send(state.instance.state()));
        });

        app.post('/servers/:id/commands/backup', (request, response) => {
            const id = parseInt(request.params.id);
            if (isNaN(id)) {
                response.status(400).send();
                return;
            }

            const state = this.serversState.get(id);
            if (state == null) {
                response.status(404).send();
                return;
            }

            if (typeof (state.instance as unknown as { backup?: () => Promise<void> }).backup !== 'function') {
                response.status(400).send('Backups are not supported for this server type yet.');
                return;
            }

            state.instance
                .backup()
                .then(() => response.send(state.instance.state()))
                .catch((error) => {
                    console.error(`Unable to backup server ${id}:`, error);
                    response.status(500).send('Unable to backup server.');
                });
        });

        app.put('/servers/:id/world/:name', (request, response) => {
            const id = parseInt(request.params.id);
            if (isNaN(id)) {
                response.status(400).send();
                return;
            }

            const state = this.serversState.get(id);
            if (state == null) {
                response.status(404).send();
                return;
            }

            if (state.edition !== MinecraftEdition.Bedrock) {
                response.status(400).send('World management is only available for Bedrock servers.');
                return;
            }

            if (!(state.instance instanceof BedrockState)) {
                response.status(400).send('World management is only available for Bedrock servers.');
                return;
            }

            state.instance.changeWorld(request.params.name).then(() => response.send(state.instance.state()));
        });

        app.put('/servers/:id/online-mode', async (request, response) => {
            const id = parseInt(request.params.id);
            if (isNaN(id)) {
                response.status(400).send('Invalid server id.');
                return;
            }

            const state = this.serversState.get(id);
            if (state == null) {
                response.status(404).send();
                return;
            }

            const { onlineMode } = request.body ?? {};
            if (typeof onlineMode !== 'boolean') {
                response.status(400).send('onlineMode is required.');
                return;
            }

            try {
                if (
                    typeof (state.instance as unknown as { setOnlineMode?: (o: boolean) => Promise<ServerState> })
                        .setOnlineMode !== 'function'
                ) {
                    response.status(400).send('Online mode is not configurable for this server type.');
                    return;
                }

                const updatedState = await state.instance.setOnlineMode(onlineMode);
                response.send(updatedState);
            } catch (error) {
                console.error(`Unable to update online-mode for server ${id}`, error);
                response.status(500).send('Unable to update online mode.');
            }
        });

        app.put('/servers/:id/settings', async (request, response) => {
            const id = parseInt(request.params.id);
            if (isNaN(id)) {
                response.status(400).send('Invalid server id.');
                return;
            }

            const state = this.serversState.get(id);
            if (state == null) {
                response.status(404).send();
                return;
            }

            const { onlineMode, contentLogConsoleOutputEnabled } = request.body ?? {};
            if (typeof onlineMode !== 'boolean' && typeof contentLogConsoleOutputEnabled !== 'boolean') {
                response.status(400).send('Provide at least one setting to update.');
                return;
            }

            try {
                if (state.edition === MinecraftEdition.Bedrock && state.instance instanceof BedrockState) {
                    const updatedState = await state.instance.updateSettings({
                        onlineMode,
                        contentLogConsoleOutputEnabled,
                    });
                    response.send(updatedState);
                    return;
                }

                if (typeof onlineMode === 'boolean') {
                    const updatedState = await state.instance.setOnlineMode(onlineMode);
                    response.send(updatedState);
                    return;
                }

                response.status(400).send('Unsupported settings for this server type.');
            } catch (error) {
                console.error(`Unable to update settings for server ${id}`, error);
                response.status(500).send('Unable to update settings.');
            }
        });

        app.post(
            '/servers/:id/worlds/upload',
            express.raw({ type: 'application/octet-stream', limit: '500mb' }),
            async (request, response) => {
                const id = parseInt(request.params.id);
                if (isNaN(id)) {
                    response.status(400).send('Invalid server id.');
                    return;
                }

                const state = this.serversState.get(id);
                if (state == null) {
                    response.status(404).send();
                    return;
                }

                if (state.edition !== MinecraftEdition.Bedrock) {
                    response.status(400).send('World uploads are only supported for Bedrock servers.');
                    return;
                }

                if (!(state.instance instanceof BedrockState)) {
                    response.status(400).send('World uploads are only supported for Bedrock servers.');
                    return;
                }

                if (state.instance.state().state !== ServerStatus.Stopped) {
                    response.status(409).send('Stop the server before importing a world.');
                    return;
                }

                const payload = request.body as Buffer;
                if (!Buffer.isBuffer(payload) || payload.length === 0) {
                    response.status(400).send('Missing world upload payload.');
                    return;
                }

                const providedName = request.headers['x-world-filename'];
                const fileName =
                    typeof providedName === 'string'
                        ? providedName
                        : Array.isArray(providedName)
                          ? providedName[0]
                          : 'world.mcworld';

                try {
                    const updatedState = await state.instance.importWorld(payload, fileName);
                    response.send(updatedState);
                } catch (error) {
                    console.error(`Unable to import world for server ${id}`, error);
                    const message = error instanceof Error ? error.message : 'Unable to import world.';
                    response.status(400).send(message);
                }
            },
        );

        app.delete('/servers/:id', (request, response) => {
            const id = parseInt(request.params.id);
            if (isNaN(id)) {
                response.status(400).send();
                return;
            }

            const state = this.serversState.get(id);
            if (state == null) {
                response.status(404).send();
                return;
            }

            if (state.instance.state().state !== ServerStatus.Stopped) {
                response.status(409).send('Server must be stopped before deletion.');
                return;
            }

            this.serversState
                .remove(id)
                .then(() => response.status(204).send())
                .catch((error) => {
                    console.error(`Unable to delete server ${id}:`, error);
                    response.status(500).send('Unable to delete server.');
                });
        });

        app.get('/bedrock/versions', (request, response) => {
            const parser = new BedrockDownloadPageParser();
            parser.getBedrockVersions().then((v) => response.send(v));
        });
    }

    public async init(): Promise<void> {
        await this.serversState.init();
    }
}
