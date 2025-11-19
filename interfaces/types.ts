export enum ServerStatus {
  Unknown = 0,
  Running = 1,
  Stopped = 2,
}

export enum BedrockMode { unknown = 'unknown', survival = 'survival', creative = 'creative', adventure = 'adventure' };


export interface ServerState {
  pid: number;
  state: number;
  stdout: string[];
  version: BedrockVersion | null;
  bedrockConfig: WorldConfiguration | null;
  crankShaftConfig: ServerConfiguration;
  exitCode?: number | null;
}

export interface BedrockVersion {
  platform: Platform;
  build: string;
  version: string;
  url: string;
  filename: string;
}

export const versionEqual = (
  allVersions: BedrockVersion[] = [],
  version?: BedrockVersion | null,
): boolean => {
  if (version == null) {
    return false;
  }

  const platformVersion = allVersions.find((v) => v.platform === version.platform);
  return platformVersion != null && platformVersion.build === version.build;
};

export interface WorldConfiguration {
  port: number;
  world: string;
  worlds: string[];
  mode: string;
  setCurrentWorld(world: string): void;
  setPort(port: number): void;
  setMode(mode: BedrockMode | string): void;
  enableDetailedTelemetry(): void;
  refreshWorlds(): void;
}

export interface ServerConfiguration {
  readonly serverPort: number;
  readonly basePath: string;
  // updateBeforeStart: true,
  // port: 3389,
  readonly versionCache: string;
}

export type Platform = 'linux' | 'windows';
