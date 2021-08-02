import type { WorkflowCompileResult } from "@truffle/compile-common";
import type { SourceInfo } from "@truffle/source-fetcher";

export type FailureType = "fetch" | "compile" | "language";

export interface FetchAndCompileResult {
  compileResult: WorkflowCompileResult;
  sourceInfo: SourceInfo;
}

export interface FetchExternalErrors {
  fetch: string[]; //addresses
  compile: string[]; //addresses
  fetchers: string[]; //fetcher names
}

export interface Recognizer {
  isAddressUnrecognized(address: string): boolean;
  getAnUnrecognizedAddress(): string | undefined;
  addCompiledInfo(
    info: FetchAndCompileResult,
    address: string,
    fetcherName: string
  ): void | Promise<void>;
  markUnrecognizable(address: string, reason?: FailureType): void;
  markBadFetcher(fetcherName: string): void;
}

//NOTE: this should really be defined by the debugger!
export interface Instances {
  [address: string]: {
    contractName?: string;
    source?: string;
    binary: string;
    constructorArgs?: string;
  };
}
