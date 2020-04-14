import { ContractObject } from "@truffle/contract-schema/spec";

export interface SourceFilesArtifacts {
  [sourceFile: string]: ContractObject[];
}

export interface SourceFilesArtifactsUpdatedTimes {
  [sourceFile: string]: number; // ms since epoch
}
