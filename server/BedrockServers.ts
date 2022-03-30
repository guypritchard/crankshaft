import path from "path";
import { ServerConfiguration } from "../interfaces/types";
import { BedrockState } from "./BedrockState";
import { JSONFile } from "./utils/JSONFile";

/**
 * This is an extremely naive implementation at this stage...  Persisting state to a file.
 */
export class BedrockServers {
  private readonly serverList: string = "servers.json";
  private readonly configPath: string;
  private state: Map<number, BedrockState> = new Map<number, BedrockState>();

  public constructor(private config: ServerConfiguration) {
    this.configPath = path.join(this.config.basePath, this.serverList)
  }

  public async init(): Promise<void> {
    if (JSONFile.exists(this.configPath)) {
      const items = JSONFile.read<Array<[number,BedrockState]>>(this.configPath);
      if (items && items.length) {
        console.log(`Found: ${items.length} servers in config.`);
        const startingServers = items.map((i) => {
          const bedrockState = new BedrockState(i[0], i[1].config?.port, this.config);
          return bedrockState.start().then(() => this.state.set(i[0], bedrockState));
        });

        await Promise.all(startingServers);
      }
      
    } else {
      await this.addNew(0);
      this.persist();
    }
  }

  public getAll() : Array<[number, BedrockState]> {
    return [...this.state.entries()];
  }

  public async addNew(id: number, port: number = 19132): Promise<BedrockState> {
    if (this.state.get(id) == null) {
      const bedrockState = new BedrockState(id, port, this.config);
      await bedrockState.start();
      this.state.set(id, bedrockState);
      return bedrockState;
    } else {
      return this.state.get(id)!;
    }
  }

  public get(id: number): BedrockState | undefined {
    return this.state.get(id);
  }

  public async remove(id: number): Promise<void> {
    const state = this.state.get(id);
    if (state != null) {
      await state.stop();
      this.state.delete(id);
      this.persist();
    }
  }

  public persist(): void {
    JSONFile.write(this.configPath, [...this.state.entries()]);
  }
}