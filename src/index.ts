import express from 'express';
import fs from 'fs';
import path from 'path';
import { BedrockConfiguration } from './server/BedrockConfiguration';
import { BedrockDownloadPageParser } from './server/BedrockDownloadPageParser';
import { BedrockState } from './server/BedrockState';
import { JSONFile } from './utils/JSONFile';

const configuration = JSONFile.read<BedrockConfiguration>('Configuration.json');

console.log('Starting');
const state = new BedrockState(configuration);
state
    .start()
    .then(() => 'done')
    .catch((e) => console.error(e));

const app = express();

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
