export enum ServerStatus {
    Unknown = 0,
    Running = 1,
    Stopped = 2,
}

export interface ServerState {
    pid: number;
    state: number;
    stdout: string[];
    version: BedrockVersion | null;
    bedrockConfig: BedrockWorldConfiguration;
}

export interface BedrockVersion {
    platform: Platform;
    build: string;
    version: string;
    url: string;
    filename: string;
}

export interface BedrockWorldConfiguration {
    worldName: string;
    serverWorlds: string[];
}

export type Platform = 'linux' | 'windows';
