import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { BedrockVersion } from '../interfaces/types';
import { JSONFile } from './utils/JSONFile';

export class BedrockRunner {
    static readonly bedrockExecutable = 'bedrock_server.exe';
    protected bedrock: ChildProcessWithoutNullStreams | undefined;
    private _stdout: string[] = [];
    private _stderr: string[] = [];

    constructor(private basePath: string) {
        if (!fs.existsSync(basePath)) {
            fs.mkdirSync(basePath, { recursive: true });
        }
    }

    public get stdout(): string[] {
        return this._stdout;
    }

    public get stderr(): string[] {
        return this._stderr;
    }

    public get pid(): number {
        return this.bedrock?.pid ?? 0;
    }

    public stop(): void {
        if (this.bedrock != null) {
            this.bedrock.stdin.write('stop\r\n');
        }
    }

    public version(): BedrockVersion | null {
        try {
            return JSONFile.read<BedrockVersion>(path.join(this.basePath, 'version.json'));
        } catch (error) {
            return null;
        }
    }

    public async start(): Promise<void> {
        this._stdout = [];
        this._stderr = [];

        const serverProcess = new Promise((resolve, reject) => {
            console.log('Starting Bedrock Server...');
            this.bedrock = spawn(path.join(this.basePath, BedrockRunner.bedrockExecutable));
            console.log(`Started Bedrock Server PID:${this.pid}`);

            let partialLine: string | undefined = '';
            this.bedrock.stdout.on('data', (data: string) => {
                const totalLogLine = data.toString();
                let endsWithPartial = false;
                const hadAPartial = partialLine != '';

                // This code is trash - needs looking at...
                if (!totalLogLine.endsWith('\r\n')) {
                    endsWithPartial = true;
                }

                const logLines = data
                    .toString()
                    .split('\r\n')
                    .filter((l) => l.length > 0);

                if (logLines.length) {
                    if (hadAPartial) {
                        this._stdout.push(partialLine + logLines[0]);
                        partialLine = '';
                    }

                    if (endsWithPartial) {
                        partialLine = logLines.pop();
                    }

                    logLines.forEach((l, i) => {
                        if (hadAPartial && i === 0) {
                            return;
                        }
                        this._stdout.push(l);
                    });
                }
            });

            this.bedrock.stderr.on('data', (data: string) => {
                this._stderr.push(data.toString());
            });

            this.bedrock.on('exit', (code: number) => {
                resolve(code);
                console.log('child process exited with code ' + code.toString());
            });

            this.bedrock.on('error', (err: Error) => {
                reject(err);
            });
        });

        await serverProcess;
    }
}
