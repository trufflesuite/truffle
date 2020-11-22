export interface FetcherConstructor {
  readonly fetcherName: string;
  forNetworkId(networkId: number, options?: FetcherOptions): Promise<Fetcher>;
}

export interface Fetcher {
  /**
   * should have same name as the static version
   */
  readonly fetcherName: string;
  /**
   * returns null if no sources for address
   * (also may return null if the sources fall under an unsupported
   * case, although currently there are no such cases)
   */
  fetchSourcesForAddress(address: string): Promise<SourceInfo | null>;
}

export interface FetcherOptions {
  apiKey?: string;
}

export interface SourceInfo {
  contractName?: string;
  sources: SourcesByPath;
  options: CompilerOptions;
}

export interface SourcesByPath {
  [sourcePath: string]: string;
}

//apologies if reinventing the wheel here
export type CompilerOptions = SolcOptions | VyperOptions; //note: only Solidity really supported atm

export interface SolcOptions {
  language: "Solidity" | "Yul"; //again, only Solidity really supported atm
  version: string;
  settings: SolcSettings;
  specializations: SolcSpecializations;
}

export interface VyperOptions {
  language: "Vyper";
  version: string;
  settings: VyperSettings;
  specializations: VyperSpecializations;
}

//only including settings that would alter compiled result
//(no outputSelection, no modelChecker once that exists, no stopAfter)
export interface SolcSettings {
  remappings?: string[];
  optimizer?: OptimizerSettings;
  evmVersion?: string; //not gonna enumerate these
  debug?: DebugSettings;
  metadata?: MetadataSettings;
  viaIR?: boolean;
  libraries?: LibrarySettings; //note: we don't actually want to return this!
}

export interface VyperSettings {
  evmVersion?: string; //not gonna enumerate these
}

export interface SolcSpecializations {
  libraries?: LibrarySettings;
  constructorArguments?: string; //encoded, as hex string, w/o 0x in front
}

export interface VyperSpecializations {
  constructorArguments?: string; //encoded, as hex string, w/o 0x in front
}

export interface SolcSources {
  [sourcePath: string]: {
    keccak256?: string;
    content?: string; //for Etherscan we assume this exists
    urls?: string;
  };
}

export interface SolcInput {
  language: "Solidity";
  sources: SolcSources;
  settings: SolcSettings;
}

export interface SolcMetadata {
  language: "Solidity" | "Yul";
  compiler: {
    version: string;
  };
  settings: SolcSettings;
  sources: SolcSources;
  version: number;
  //there's also output, but we don't care about that
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
