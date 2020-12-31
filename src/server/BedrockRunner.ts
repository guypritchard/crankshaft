import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { BedrockVersion } from './BedrockVersion';
import { JSONFile } from '../utils/JSONFile';

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
        return JSONFile.read<BedrockVersion>(path.join(this.basePath, 'version.json'));
    }

    public async start(): Promise<void> {
        const serverProcess = new Promise((resolve, reject) => {
            this.bedrock = spawn(path.join(this.basePath, BedrockRunner.bedrockExecutable));
            console.log('Started');
            this.bedrock.stdout.on('data', (data: string) => {
                this._stdout.push(data.toString());
            });

            this.bedrock.stderr.on('data', (data: string) => {
                this._stderr.push(data.toString());
            });

            this.bedrock.on('exit', (code: number) => {
                resolve(code);
                console.log('child process exited with code ' + code.toString());
            });
        });

        await serverProcess;
    }
}
