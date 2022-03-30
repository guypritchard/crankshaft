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
  bedrockConfig: WorldConfiguration | null;
  crankShaftConfig: ServerConfiguration;
}

export interface BedrockVersion {
  platform: Platform;
  build: string;
  version: string;
  url: string;
  filename: string;
}

export const versionEqual = (allVersions: BedrockVersion[], version: BedrockVersion): boolean => {
  const platformVersion = allVersions.filter((v) => v.platform === version.platform)[0];
  return platformVersion.build === version.build;
};

export interface WorldConfiguration {
  port: number;
  world: string;
  worlds: string[];
  setCurrentWorld(world: string): void;
  setPort(port: number): void;
}

export interface ServerConfiguration {
  readonly serverPort: number;
  readonly basePath: string;
  // updateBeforeStart: true,
  // port: 3389,
  readonly versionCache: string;
}

export type Platform = 'linux' | 'windows';
