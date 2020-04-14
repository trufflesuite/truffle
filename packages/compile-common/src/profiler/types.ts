import { ContractObject } from "@truffle/contract-schema/spec";

export interface SourceFilesArtifacts {
  [filePath: string]: ContractObject[];
}

export interface SourceFilesArtifactsUpdatedTimes {
  [filePath: string]: number; // ms since epoch
}

export interface ResolvedSourcesMapping {
  [filePath: string]: {
    body: string;
    filePath: string;
  };
}
