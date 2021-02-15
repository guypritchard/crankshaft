export interface ServerState {
    pid: number;
    stdout: string[];
    version: BedrockVersion | null;
}
export interface BedrockVersion {
    platform: Platform;
    version: string;
    url: string;
    filename: string;
}

export type Platform = 'linux' | 'windows';
