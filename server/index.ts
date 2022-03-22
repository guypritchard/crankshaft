#!/usr/bin/env node
import express from 'express';
import { CrankShaft } from './BedrockServer.js';
import { JSONFile } from './utils/JSONFile.js';
import cors from 'cors';
import path from 'path';
import { ServerConfiguration } from '../interfaces/types';
let configuration: ServerConfiguration;

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
    configuration = JSONFile.read<ServerConfiguration>(path.join(__dirname, '../Configuration.json'));
} catch (error) {
    configuration = JSONFile.read<ServerConfiguration>(path.join(__dirname, './Configuration.json'));
}

const app = express();
app.use(cors());
console.log(`Hosting frontend from: ${path.join(__dirname, '../../../dist/frontend')}`);
app.use(express.static(path.join(__dirname, '../../../dist/frontend')));
new CrankShaft(app, configuration)
  .init()
  .then(() => {
    app.listen(configuration.serverPort, () => {
      console.log(`Listening on port ${configuration.serverPort}`); 
    });
  }
);


