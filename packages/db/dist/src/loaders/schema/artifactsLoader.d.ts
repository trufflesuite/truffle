import { TruffleDB } from "@truffle/db/db";
import { ContractObject } from "@truffle/contract-schema/spec";
declare type NetworkLinkObject = {
  [name: string]: string;
};
declare type LinkValueLinkReferenceObject = {
  bytecode: string;
  index: number;
};
declare type LinkValueObject = {
  value: string;
  linkReference: LinkValueLinkReferenceObject;
};
declare type LoaderNetworkObject = {
  contract: string;
  id: string;
  address: string;
  transactionHash: string;
  links?: NetworkLinkObject;
};
declare type LinkReferenceObject = {
  offsets: Array<number>;
  name: string;
  length: number;
};
declare type BytecodeInfo = {
  id: string;
  linkReferences: Array<LinkReferenceObject>;
  bytes?: string;
};
declare type IdObject = {
  id: string;
};
declare type CompilationConfigObject = {
  contracts_directory?: string;
  contracts_build_directory?: string;
  artifacts_directory?: string;
  working_directory?: string;
  all?: boolean;
};
declare type NameRecordObject = {
  name: string;
  type: string;
  resource: IdObject;
  previous?: IdObject;
};
export declare class ArtifactsLoader {
  private db;
  private config;
  constructor(db: TruffleDB, config?: CompilationConfigObject);
  load(): Promise<void>;
  loadNameRecords(
    projectId: string,
    nameRecords: NameRecordObject[]
  ): Promise<void>;
  resolveProjectName(
    projectId: string,
    type: string,
    name: string
  ): Promise<{
    id: any;
  }>;
  loadNetworks(
    projectId: string,
    contracts: Array<ContractObject>,
    artifacts: string,
    workingDirectory: string
  ): Promise<any[][]>;
  getNetworkLinks(
    network: LoaderNetworkObject,
    bytecode: BytecodeInfo
  ): LinkValueObject[];
  loadContractInstances(
    contracts: Array<DataModel.IContract>,
    networksArray: Array<Array<LoaderNetworkObject>>
  ): Promise<void>;
}
export {};
