import { BedrockConfiguration } from './BedrockConfiguration';
import { BedrockDownloadPageParser } from './BedrockDownloadPageParser';
import { BedrockState } from './BedrockState';
import express, { request } from 'express';

export class CrankShaft {
    constructor(app: express.Express, configuration: BedrockConfiguration) {
        const state = new BedrockState(configuration);
        state
            .start()
            .then(() => 'done')
            .catch((e) => console.error(e));

        app.get('/server', (request, response) => {
            response.send(state.state());
        });

        app.post('/server/commands/update', (request, response) => {
            state.update().then(() => response.send(state.state()));
        });

        app.post('/server/commands/stop', (request, response) => {
            state.stop().then(() => response.send(state.state()));
        });

        app.post('/server/commands/start', (request, response) => {
            state.start().then(() => response.send(state.state()));
        });

        app.get('/bedrock/version', (request, response) => {
            const parser = new BedrockDownloadPageParser();
            parser.getBedrockVersions().then((v) => response.send(v));
        });
    }
}
