export { schema } from "./schema";
import { Databases } from "./pouch";
import { WorkspaceCollections } from "./definitions";
export interface WorkspaceConfig {
  workingDirectory?: string;
  adapter?: {
    name: string;
    settings?: any;
  };
}
export declare class Workspace {
  databases: Databases<WorkspaceCollections>;
  constructor({
    workingDirectory,
    adapter: { name, settings }
  }: WorkspaceConfig);
  /***************************************************************************
   * Collection queries
   ***************************************************************************/
  bytecodes(): Promise<DataModel.IBytecode[]>;
  compilations(): Promise<DataModel.ICompilation[]>;
  contracts(): Promise<DataModel.IContract[]>;
  contractInstances(): Promise<DataModel.IContractInstance[]>;
  nameRecords(): Promise<DataModel.INameRecord[]>;
  networks(): Promise<DataModel.INetwork[]>;
  sources(): Promise<DataModel.ISource[]>;
  projects(): Promise<DataModel.IProject[]>;
  /***************************************************************************
   * Resource queries
   ***************************************************************************/
  bytecode({ id }: { id: string }): Promise<DataModel.IBytecode | null>;
  compilation({ id }: { id: string }): Promise<DataModel.ICompilation | null>;
  contract({ id }: { id: string }): Promise<DataModel.IContract | null>;
  contractInstance({
    id
  }: {
    id: string;
  }): Promise<DataModel.IContractInstance | null>;
  nameRecord({ id }: { id: string }): Promise<DataModel.INameRecord | null>;
  network({ id }: { id: string }): Promise<DataModel.INetwork | null>;
  source({ id }: { id: string }): Promise<DataModel.ISource | null>;
  project({ id }: { id: string }): Promise<DataModel.IProject | null>;
  projectNames({
    project,
    name,
    type
  }: {
    project: any;
    name: any;
    type: any;
  }): Promise<DataModel.INameRecord[]>;
  /***************************************************************************
   * Mutations
   ***************************************************************************/
  bytecodesAdd({
    input
  }: {
    input: any;
  }): Promise<{
    bytecodes: DataModel.IBytecode[];
  }>;
  compilationsAdd({
    input
  }: {
    input: any;
  }): Promise<{
    compilations: DataModel.ICompilation[];
  }>;
  contractsAdd({
    input
  }: {
    input: any;
  }): Promise<{
    contracts: DataModel.IContract[];
  }>;
  contractInstancesAdd({
    input
  }: {
    input: any;
  }): Promise<{
    contractInstances: DataModel.IContractInstance[];
  }>;
  nameRecordsAdd({
    input
  }: {
    input: any;
  }): Promise<{
    nameRecords: DataModel.INameRecord[];
  }>;
  networksAdd({
    input
  }: {
    input: any;
  }): Promise<{
    networks: DataModel.INetwork[];
  }>;
  sourcesAdd({
    input
  }: {
    input: any;
  }): Promise<{
    sources: DataModel.ISource[];
  }>;
  projectsAdd({
    input
  }: {
    input: any;
  }): Promise<{
    projects: DataModel.IProject[];
  }>;
  projectNamesAssign({
    input
  }: {
    input: any;
  }): Promise<{
    projectNames: DataModel.IProjectName[];
  }>;
  /***************************************************************************
   * Misc.
   ***************************************************************************/
  contractNames(): Promise<DataModel.IContract["name"][]>;
}
