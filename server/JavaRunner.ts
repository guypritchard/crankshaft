import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { JavaVersion, MinecraftEdition } from '../interfaces/types.js';
import { JSONFile } from './utils/JSONFile.js';

export class JavaRunner {
    static readonly serverJar = 'server.jar';

    protected javaProcess: ChildProcessWithoutNullStreams | undefined;
    private _stdout: string[] = [];
    private _stderr: string[] = [];
    private exitCode: number | null = null;

    public constructor(
        private basePath: string,
        private maxMemoryMb: number,
    ) {
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
        return this.javaProcess?.pid ?? 0;
    }

    public get lastExitCode(): number | null {
        return this.exitCode;
    }

    public stop(): void {
        if (this.javaProcess != null) {
            this.javaProcess.stdin.write('stop\n');
        }
    }

    public version(): JavaVersion | null {
        const versionFile = path.join(this.basePath, 'version.json');
        if (JSONFile.exists(versionFile) === false) {
            return null;
        }

        try {
            const version = JSONFile.read<JavaVersion>(versionFile);
            const cleanBuild = version.build?.replace(/^java[\s-]*/i, '') ?? version.build;
            const cleanVersion = version.version?.replace(/^java[\s-]*/i, '') ?? version.version;
            return { ...version, build: cleanBuild, version: cleanVersion, edition: MinecraftEdition.Java };
        } catch {
            return null;
        }
    }

    public async start(): Promise<void> {
        this._stdout = [];
        this._stderr = [];

        const serverProcess = new Promise<void>((resolve, reject) => {
            const jarPath = path.join(this.basePath, JavaRunner.serverJar);
            console.log(`Starting Java Server at '${this.basePath}'`);

            this.javaProcess = spawn('java', [`-Xmx${this.maxMemoryMb}M`, '-jar', jarPath, '--nogui'], {
                cwd: this.basePath,
            });
            console.log(`Started Java Server PID:${this.pid}`);

            this.javaProcess.stdout.on('data', (data: string | Buffer) => {
                data.toString()
                    .split(/\r?\n/)
                    .filter((line) => line.length > 0)
                    .forEach((line) => this._stdout.push(line));
            });

            this.javaProcess.stderr.on('data', (data: string | Buffer) => {
                this._stderr.push(data.toString());
            });

            this.javaProcess.on('exit', (code: number | null) => {
                this.exitCode = code ?? null;
                console.log('Java server exited with code ' + (code ?? 'null').toString());
                resolve();
            });

            this.javaProcess.on('error', (err: Error) => {
                reject(err);
            });
        });

        await serverProcess;
        this.javaProcess = undefined;
    }
}
