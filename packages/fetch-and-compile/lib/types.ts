import type { WorkflowCompileResult } from "@truffle/compile-common";
import type {
  SourceInfo,
  NetworkInfo as FetcherNetworkInfo
} from "@truffle/source-fetcher";

export interface NetworkInfo extends FetcherNetworkInfo {
  fetchers: string[];
}

export interface SupportedNetworks {
  [name: string]: NetworkInfo;
}

export type FailureType = "fetch" | "compile" | "language";

export interface FetchAndCompileResult {
  compileResult: WorkflowCompileResult;
  sourceInfo: SourceInfo;
  fetchedVia: string;
}

export interface FetchAndCompileMultipleResult {
  results: {
    [address: string]: FetchAndCompileResult;
  };
  failures: {
    [address: string]: FetchAndCompileFailureRecord;
  };
}

//for debugger
export interface FetchExternalErrors {
  fetch: string[]; //addresses
  compile: string[]; //addresses
  fetchers: string[]; //fetcher names
}

export interface FetchAndCompileFailureRecord {
  reason?: FailureType;
  error?: Error;
}

export interface Recognizer {
  isAddressUnrecognized(address: string): boolean;
  getAnUnrecognizedAddress(): string | undefined;
  addCompiledInfo(
    info: FetchAndCompileResult,
    address: string
  ): void | Promise<void>;
  markUnrecognizable(
    address: string,
    reason?: FailureType,
    error?: Error
  ): void;
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
