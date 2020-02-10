import path from "path";

export { schema } from "./schema";
import {
  Databases,
  FSDatabases,
  MemoryDatabases,
  SqliteDatabases
} from "./pouch";
import { WorkspaceCollections, definitions } from "./definitions";

export interface WorkspaceConfig {
  workingDirectory?: string;
  adapter?: {
    name: string;
    settings?: any; // to allow adapters to define any options type
  };
}

export class Workspace {
  public databases: Databases<WorkspaceCollections>;

  constructor({
    workingDirectory,
    adapter: { name, settings } = { name: "fs" }
  }: WorkspaceConfig) {
    switch (name) {
      case "fs": {
        this.databases = new FSDatabases({
          definitions,
          settings: settings || getDefaultFSAdapterSettings(workingDirectory)
        });
        break;
      }
      case "sqlite": {
        this.databases = new SqliteDatabases({
          definitions,
          settings:
            settings || getDefaultSqliteAdapterSettings(workingDirectory)
        });
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

  async nameRecords(): Promise<DataModel.INameRecord[]> {
    return await this.databases.all("nameRecords");
  }

  async networks(): Promise<DataModel.INetwork[]> {
    return await this.databases.all("networks");
  }

  async sources(): Promise<DataModel.ISource[]> {
    return await this.databases.all("sources");
  }

  async projects(): Promise<DataModel.IProject[]> {
    return await this.databases.all("projects");
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

  async nameRecord({
    id
  }: {
    id: string;
  }): Promise<DataModel.INameRecord | null> {
    return await this.databases.get("nameRecords", id);
  }

  async network({ id }: { id: string }): Promise<DataModel.INetwork | null> {
    return await this.databases.get("networks", id);
  }

  async source({ id }: { id: string }): Promise<DataModel.ISource | null> {
    return await this.databases.get("sources", id);
  }

  async project({ id }: { id: string }): Promise<DataModel.IProject | null> {
    return await this.databases.get("projects", id);
  }

  async projectNames({
    project,
    name,
    type
  }): Promise<DataModel.INameRecord[]> {
    const results = await this.databases.find("projectNames", {
      selector: { "project.id": project.id, name, type }
    });
    const nameRecordIds = results.map(({ nameRecord: { id } }) => id);
    return await this.databases.find("nameRecords", {
      selector: {
        id: { $in: nameRecordIds }
      }
    });
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

  async nameRecordsAdd({
    input
  }): Promise<{ nameRecords: DataModel.INameRecord[] }> {
    return await this.databases.add("nameRecords", input);
  }

  async networksAdd({ input }): Promise<{ networks: DataModel.INetwork[] }> {
    return await this.databases.add("networks", input);
  }

  async sourcesAdd({ input }): Promise<{ sources: DataModel.ISource[] }> {
    return await this.databases.add("sources", input);
  }

  async projectsAdd({ input }): Promise<{ projects: DataModel.IProject[] }> {
    return await this.databases.add("projects", input);
  }

  async projectNamesAssign({
    input
  }): Promise<{ projectNames: DataModel.IProjectName[] }> {
    return await this.databases.update("projectNames", input);
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

const getDefaultFSAdapterSettings = workingDirectory => ({
  directory: path.join(workingDirectory, ".db", "json")
});

const getDefaultSqliteAdapterSettings = workingDirectory => ({
  directory: path.join(workingDirectory, ".db", "sqlite")
});
