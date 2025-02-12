import * as fs from 'fs';
import fetch from 'node-fetch';
import https from 'https';
import * as path from 'path';
import { BedrockVersion } from '../interfaces/types.js';

export class BedrockDownloader {


  private downloadFile(url: string, dest: string){
    var file = fs.createWriteStream(dest);
    return new Promise<void>((resolve, reject) => {
      var responseSent = false; // flag to make sure that response is sent only once.
      https.get(url, response => {
        response.pipe(file);
        file.on('finish', () =>{
          file.close(() => {
            if(responseSent)  return;
            responseSent = true;
            resolve();
          });
        });
      }).on('error', err => {
          if(responseSent)  return;
          responseSent = true;
          reject(err);
      });
    });
  }

    public async download(versionCache: string, version: BedrockVersion): Promise<void> {
        if (fs.existsSync(versionCache) === false) {
            fs.mkdirSync(versionCache, { recursive: true });
        }

        const localFile = path.join(versionCache, version.filename);

        if (fs.existsSync(localFile)) {
            console.log('Found current version - skipping download.');
            return;
        }

        console.log('Downloading...');

        await this.downloadFile(version.url, localFile);
    }
}
