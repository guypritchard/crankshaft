export interface ServerState {
    pid: number;
    state: number;
    stdout: string[];
    version: BedrockVersion | null;
}
export interface BedrockVersion {
    platform: Platform;
    build: string;
    version: string;
    url: string;
    filename: string;
}

export type Platform = 'linux' | 'windows';
