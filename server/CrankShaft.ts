import { BedrockDownloadPageParser } from './BedrockDownloadPageParser';
import express from 'express';
import { ServerConfiguration, ServerStatus } from '../interfaces/types.js';
import { BedrockServers } from './BedrockServers.js';

export class CrankShaft {
  private readonly serversState: BedrockServers; 

  constructor(app: express.Express, configuration: ServerConfiguration) {
    this.serversState = new BedrockServers(configuration);

    app.get('/servers', (request, response) => {
      response.send(this.serversState.getAll().map((s) => { return {id: s[0], state: s[1].state()} }));
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

      const portRequest: {port:number} = request.body;

      this.serversState.addNew(id, portRequest.port).then((added) => response.send(added));
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

      response.send(state.state());
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

      response.send(state.state()?.stdout);
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

      state.update().then(() => response.send(state.state()));
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

      state.stop().then(() => response.send(state.state()));
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

      state.start().then(() => response.send(state.state()));
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

      state.backup().then(() => response.send(state.state()));
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

      state.changeWorld(request.params.name).then(() => response.send(state.state()));
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

        if (state.state().state !== ServerStatus.Stopped) {
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
          const updatedState = await state.importWorld(payload, fileName);
          response.send(updatedState);
        } catch (error) {
          console.error(`Unable to import world for server ${id}`, error);
          const message = error instanceof Error ? error.message : 'Unable to import world.';
          response.status(400).send(message);
        }
      }
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

      if (state.state().state !== ServerStatus.Stopped) {
        response.status(409).send('Server must be stopped before deletion.');
        return;
      }

      this.serversState.remove(id)
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
