import path from "path";

export { schema } from "./schema";
import { FSDatabases, MemoryDatabases } from "./pouch";
import { WorkspaceDatabases } from "./types";
import { definitions } from "./definitions";

export interface WorkspaceConfig {
  workingDirectory?: string;
  adapter?: {
    name: string;
    settings?: any; // to allow adapters to define any options type
  };
}

const getDefaultAdapter = workingDirectory => ({
  name: "fs",
  settings: {
    directory: path.join(workingDirectory, ".db", "json")
  }
});

export class Workspace {
  public databases: WorkspaceDatabases;

  constructor({
    workingDirectory,
    adapter: { name, settings } = getDefaultAdapter(workingDirectory)
  }: WorkspaceConfig) {
    switch (name) {
      case "fs": {
        this.databases = new FSDatabases({ definitions, settings });
        break;
      }
      case "memory": {
        this.databases = new MemoryDatabases({ definitions, settings });
        break;
      }
      default: {
        throw new Error(`Unknown Truffle DB adapter: ${name}`);
      }
    }
  }

  /***************************************************************************
   * Collection queries
   ***************************************************************************/

  async bytecodes(): Promise<DataModel.IBytecode[]> {
    return await this.databases.all("bytecodes");
  }

  async compilations(): Promise<DataModel.ICompilation[]> {
    return await this.databases.all("compilations");
  }

  async contracts(): Promise<DataModel.IContract[]> {
    return await this.databases.all("contracts");
  }

  async contractInstances(): Promise<DataModel.IContractInstance[]> {
    return await this.databases.all("contractInstances");
  }

  async networks(): Promise<DataModel.INetwork[]> {
    return await this.databases.all("networks");
  }

  async sources(): Promise<DataModel.ISource[]> {
    return await this.databases.all("sources");
  }

  /***************************************************************************
   * Resource queries
   ***************************************************************************/

  async bytecode({ id }: { id: string }): Promise<DataModel.IBytecode | null> {
    return await this.databases.get("bytecodes", id);
  }

  async compilation({
    id
  }: {
    id: string;
  }): Promise<DataModel.ICompilation | null> {
    return await this.databases.get("compilations", id);
  }

  async contract({ id }: { id: string }): Promise<DataModel.IContract | null> {
    return await this.databases.get("contracts", id);
  }

  async contractInstance({
    id
  }: {
    id: string;
  }): Promise<DataModel.IContractInstance | null> {
    return await this.databases.get("contractInstances", id);
  }

  async network({ id }: { id: string }): Promise<DataModel.INetwork | null> {
    return await this.databases.get("networks", id);
  }
  async source({ id }: { id: string }): Promise<DataModel.ISource | null> {
    return await this.databases.get("sources", id);
  }

  /***************************************************************************
   * Mutations
   ***************************************************************************/

  async bytecodesAdd({ input }): Promise<{ bytecodes: DataModel.IBytecode[] }> {
    return await this.databases.add("bytecodes", input);
  }

  async compilationsAdd({
    input
  }): Promise<{ compilations: DataModel.ICompilation[] }> {
    return await this.databases.add("compilations", input);
  }

  async contractsAdd({ input }): Promise<{ contracts: DataModel.IContract[] }> {
    return await this.databases.add("contracts", input);
  }

  async contractInstancesAdd({
    input
  }): Promise<{ contractInstances: DataModel.IContractInstance[] }> {
    return await this.databases.add("contractInstances", input);
  }

  async networksAdd({ input }): Promise<{ networks: DataModel.INetwork[] }> {
    return await this.databases.add("networks", input);
  }

  async sourcesAdd({ input }): Promise<{ sources: DataModel.ISource[] }> {
    return await this.databases.add("sources", input);
  }

  /***************************************************************************
   * Misc.
   ***************************************************************************/

  async contractNames(): Promise<DataModel.IContract["name"][]> {
    const contracts = await this.databases.find("contracts", {
      selector: {},
      fields: ["name"]
    });
    return contracts.map(({ name }) => name);
  }
}
