import { BedrockConfiguration } from './BedrockConfiguration';
import { BedrockDownloadPageParser } from './BedrockDownloadPageParser';
import { BedrockState } from './BedrockState';
import express from 'express';

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

        app.post('/server/update', (request, response) => {
            state.update().then((updated) => response.send({ updated }));
        });

        app.get('/bedrock/version', (request, response) => {
            const parser = new BedrockDownloadPageParser();
            parser.getBedrockVersions().then((v) => response.send(v));
        });
    }
}
