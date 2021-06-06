import { BedrockDownloadPageParser } from './BedrockDownloadPageParser';
import { BedrockState } from './BedrockState';
import express from 'express';
import { ServerConfiguration } from '../interfaces/types';

export class CrankShaft {
    constructor(app: express.Express, configuration: ServerConfiguration) {
        const state = new BedrockState(configuration);
        state
            .start()
            .then(() => 'done')
            .catch((e) => console.error(e));

        app.get('/servers/:id', (request, response) => {
            response.send(state.state());
        });

        app.get('/servers/:id/stdout', (request, response) => {
            response.send(state.state()?.stdout);
        });

        app.post('/servers/:id/commands/update', (request, response) => {
            state.update().then(() => response.send(state.state()));
        });

        app.post('/servers/:id/commands/stop', (request, response) => {
            state.stop().then(() => response.send(state.state()));
        });

        app.post('/servers/:id/commands/start', (request, response) => {
            state.start().then(() => response.send(state.state()));
        });

        app.post('/servers/:id/commands/backup', (request, response) => {
            state.backup().then(() => response.send(state.state()));
        });

        app.get('/bedrock/versions', (request, response) => {
            const parser = new BedrockDownloadPageParser();
            parser.getBedrockVersions().then((v) => response.send(v));
        });
    }
}
