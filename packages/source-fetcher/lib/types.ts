export interface FetcherConstructor {
  forNetworkId(networkId: number): Promise<Fetcher>;
}

export interface Fetcher {
  readonly name: string;
  isNetworkValid(): Promise<boolean>;
  /**
   * returns null if no Solidity sources for address
   * (address not in system, sources are Vyper, whatever)
   */
  fetchSourcesForAddress(address: string): Promise<SourceInfo | null>;
}

export interface SourceInfo {
  sources: SourcesByPath;
  options: SolcOptions;
}

export interface SourcesByPath {
  [sourcePath: string]: string;
}

//apologies if reinventing the wheel here
export interface SolcOptions {
  version: string;
  settings: SolcSettings;
}

//only including settings that would alter compiled result
export interface SolcSettings {
  remappings?: string[];
  optimizer?: OptimizerSettings;
  evmVersion?: string; //not gonna enumerate these
  debug?: DebugSettings;
  metadata?: MetadataSettings;
  libraries: LibrarySettings;
}

export interface SolcSources {
  [sourcePath: string]: {
    content: string;
  };
}

export interface SolcInput {
  language: "Solidity";
  sources: SolcSources;
  settings: SolcSettings;
  //there's also outputSelection, but, frankly, we don't care about this
}

export interface LibrarySettings {
  [contractPath: string]: Libraries;
}

export interface Libraries {
  [libraryName: string]: string;
}

export interface MetadataSettings {
  useLiteralContent?: boolean;
  bytecodeHash?: "none" | "ipfs" | "bzzr1";
}

export interface DebugSettings {
  revertStrings?: "default" | "strip" | "debug" | "verboseDebug";
}

export interface OptimizerSettings {
  enabled?: boolean;
  runs?: number;
  details?: OptimizerDetails;
}

export interface OptimizerDetails {
  peephole?: boolean;
  jumpdestRemover?: boolean;
  orderLiterals?: boolean;
  deduplicate?: boolean;
  cse?: boolean;
  constantOptimizer?: boolean;
  yul?: boolean;
  yulDetails?: YulDetails;
}

export interface YulDetails {
  stackAllocation?: boolean;
  optimizerSteps?: string;
}
