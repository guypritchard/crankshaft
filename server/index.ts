#!/usr/bin/env node
import express from 'express';
import { CrankShaft } from './CrankShaft.js';
import { JSONFile } from './utils/JSONFile.js';
import cors from 'cors';
import path from 'path';
import { ServerConfiguration } from '../interfaces/types';
let configuration: ServerConfiguration;

try {
    configuration = JSONFile.read<ServerConfiguration>('../Configuration.json');
} catch (error) {
    configuration = JSONFile.read<ServerConfiguration>('./Configuration.json');
}

const app = express();
app.use(express.json());
app.use(cors());
console.log(`Hosting frontend from: ${path.join(__dirname, '../../../frontend/dist')}`);
app.use(express.static(path.join(__dirname, '../../../frontend/dist')));
new CrankShaft(app, configuration)
  .init()
  .then(() => {
    app.listen(configuration.serverPort, () => {
      console.log(`Listening on port ${configuration.serverPort}`); 
    });
  }
);


