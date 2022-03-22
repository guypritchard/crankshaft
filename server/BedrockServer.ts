import { BedrockDownloadPageParser } from './BedrockDownloadPageParser.js';
import { BedrockState } from './BedrockState.js';
import express from 'express';
import { ServerConfiguration } from '../interfaces/types.js';

export class CrankShaft {
    private readonly state: BedrockState;

    constructor(app: express.Express, configuration: ServerConfiguration) {
        this.state = new BedrockState(configuration);
        
        app.get('/servers/:id', (request, response) => {
            response.send(this.state.state());
        });

        app.get('/servers/:id/stdout', (request, response) => {
            response.send(this.state.state()?.stdout);
        });

        app.post('/servers/:id/commands/update', (request, response) => {
          this.state.update().then(() => response.send(this.state.state()));
        });

        app.post('/servers/:id/commands/stop', (request, response) => {
          this.state.stop().then(() => response.send(this.state.state()));
        });

        app.post('/servers/:id/commands/start', (request, response) => {
          this.state.start().then(() => response.send(this.state.state()));
        });

        app.post('/servers/:id/commands/backup', (request, response) => {
          this.state.backup().then(() => response.send(this.state.state()));
        });

        app.get('/bedrock/versions', (request, response) => {
            const parser = new BedrockDownloadPageParser();
            parser.getBedrockVersions().then((v) => response.send(v));
        });
    }

    public async init(): Promise<void> {
      await this.state.start();
    }
}
