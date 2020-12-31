import { BedrockConfiguration } from './BedrockConfiguration';
import { BedrockDownloadPageParser } from './BedrockDownloadPageParser';
import { BedrockState } from './BedrockState';
import { JSONFile } from '../utils/JSONFile';
import express from 'express';

export class BedrockServer {
    constructor(app: express.Express) {
        const configuration = JSONFile.read<BedrockConfiguration>('Configuration.json');

        console.log('Starting');
        const state = new BedrockState(configuration);
        state
            .start()
            .then(() => 'done')
            .catch((e) => console.error(e));

        app.listen(5000, () => {
            console.log('Listening on port 5000');
        });

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
