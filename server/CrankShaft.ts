import { BedrockDownloadPageParser } from './BedrockDownloadPageParser.js';
import { BedrockState } from './BedrockState.js';
import express from 'express';
import { ServerConfiguration } from '../interfaces/types.js';
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

    app.get('/bedrock/versions', (request, response) => {
      const parser = new BedrockDownloadPageParser();
      parser.getBedrockVersions().then((v) => response.send(v));
    });
  }

  public async init(): Promise<void> {
    this.serversState.init();
  }
}
