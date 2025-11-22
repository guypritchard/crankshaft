export enum ServerStatus {
  Unknown = 0,
  Running = 1,
  Stopped = 2,
}

export enum BedrockMode { unknown = 'unknown', survival = 'survival', creative = 'creative', adventure = 'adventure' };

export enum MinecraftEdition {
  Bedrock = 'bedrock',
  Java = 'java',
}

export interface JavaServerConfiguration {
  port: number;
  maxMemoryMb: number;
  eulaAccepted: boolean;
  jar?: string | null;
  onlineMode?: boolean;
  mode?: BedrockMode | string;
}


export interface ServerState {
  pid: number;
  state: number;
  edition: MinecraftEdition;
  stdout: string[];
  version: ServerVersion | null;
  bedrockConfig: WorldConfiguration | null;
  javaConfig?: JavaServerConfiguration | null;
  crankShaftConfig: ServerConfiguration;
  exitCode?: number | null;
}

export interface BedrockVersion {
  edition?: MinecraftEdition.Bedrock;
  platform: Platform;
  build: string;
  version: string;
  url: string;
  filename: string;
}

export interface JavaVersion {
  edition: MinecraftEdition.Java;
  build: string;
  version: string;
  url: string;
  filename: string;
  sha1?: string;
}

export type ServerVersion = BedrockVersion | JavaVersion;

export const versionEqual = (
  allVersions: ServerVersion[] = [],
  version?: ServerVersion | null,
): boolean => {
  if (version == null) {
    return false;
  }

  const found = allVersions.find((candidate) => {
    const candidateEdition =
      'edition' in candidate
        ? (candidate as JavaVersion | BedrockVersion).edition
        : MinecraftEdition.Bedrock;
    const targetEdition =
      'edition' in (version as JavaVersion | BedrockVersion)
        ? (version as JavaVersion | BedrockVersion).edition
        : MinecraftEdition.Bedrock;

    if (candidateEdition !== targetEdition) {
      return false;
    }

    if ('platform' in candidate && 'platform' in (version as BedrockVersion)) {
      return (candidate as BedrockVersion).platform === (version as BedrockVersion).platform;
    }

    return candidate.build === version.build;
  });

  return found != null && found.build === version.build;
};

export interface WorldConfiguration {
  port: number;
  world: string;
  worlds: string[];
  mode: string;
  onlineMode: boolean;
  contentLogConsoleOutputEnabled?: boolean;
  setCurrentWorld(world: string): void;
  setPort(port: number): void;
  setMode(mode: BedrockMode | string): void;
  setOnlineMode(onlineMode: boolean): void;
  setContentLogConsoleOutputEnabled?(enabled: boolean): void;
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
