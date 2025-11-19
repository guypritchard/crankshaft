import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { BedrockVersion } from '../interfaces/types.js';
import { JSONFile } from './utils/JSONFile.js';
import { wait } from './utils/Wait.js';

export class BedrockRunner {
    static readonly bedrockExecutable = 'bedrock_server.exe';
    protected bedrock: ChildProcessWithoutNullStreams | undefined;
    private _stdout: string[] = [];
    private _stderr: string[] = [];
    private exitCode: number | null = null;

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

    public get lastExitCode(): number | null {
        return this.exitCode;
    }

    public stop(): void {
        if (this.bedrock != null) {
            this.bedrock.stdin.write('stop\r\n');
        }
    }

    public async backup(): Promise<void> {
        if (this.bedrock != null) {
            this.bedrock.stdin.write('save hold\r\n');
            await wait(10 * 1000);
            this.bedrock.stdin.write('save resume\r\n');
        }
    }

    public version(): BedrockVersion | null {
        const versionFile = path.join(this.basePath, 'version.json');
        if (JSONFile.exists(versionFile) === false) {
            return null;
        }

        try {
            return JSONFile.read<BedrockVersion>(versionFile);
        } catch (error) {
            return null;
        }
    }

    public async start(): Promise<void> {
        this._stdout = [];
        this._stderr = [];

        const serverProcess = new Promise((resolve, reject) => {
            console.log(`Starting Bedrock Server at '${this.basePath}'`);
            this.bedrock = spawn(path.join(this.basePath, BedrockRunner.bedrockExecutable));
            console.log(`Started Bedrock Server PID:${this.pid}`);

            let partialLine: string = '';
            this.bedrock.stdout.on('data', (data: string) => {
                const totalLogLine = data.toString();
                let endsWithPartial = false;

                // This code is trash - needs looking at...
                if (!totalLogLine.endsWith('\r\n')) {
                    endsWithPartial = true;
                }

                const logLines = totalLogLine
                    .split('\r\n')
                    .filter((l) => l.length > 0);

                if (logLines.length > 0) {
                    if (partialLine !== '') {
                        logLines[0] = partialLine + logLines[0];
                        partialLine = '';
                    }

                    if (endsWithPartial) {
                        partialLine += logLines.pop();
                    }

                    logLines.forEach((l, i) => {
                        this._stdout.push(l);
                    });
                }
            });

            this.bedrock.stderr.on('data', (data: string) => {
                this._stderr.push(data.toString());
            });

            this.bedrock.on('exit', (code: number | null) => {
                this.exitCode = code ?? null;
                console.log('child process exited with code ' + (code ?? 'null').toString());
                resolve(code);
            });

            this.bedrock.on('error', (err: Error) => {
                reject(err);
            });
        });

        await serverProcess;
        this.bedrock = undefined;
    }
}
