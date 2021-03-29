import * as express from 'express';
import { CrankShaft } from './BedrockServer';
import { JSONFile } from './utils/JSONFile';
import * as cors from 'cors';
import * as path from 'path';
import { ServerConfiguration } from '../interfaces/types';
const configuration = JSONFile.read<ServerConfiguration>('../Configuration.json');

const app = express();
app.use(cors());
console.log(path.join(__dirname, '../front'));
app.use(express.static(path.join(__dirname, '../front')));
new CrankShaft(app, configuration);

app.listen(configuration.serverPort, () => {
    console.log(`Listening on port ${configuration.serverPort}`);
});
