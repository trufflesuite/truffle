import { ContractObject } from "@truffle/contract-schema/spec";

export interface SourceFilesArtifacts {
  [sourceFile: string]: ContractObject[];
}
