export interface FetcherConstructor {
  forNetworkId(networkId: number): Fetcher;
}

export interface Fetcher {
  readonly name: string;
  isNetworkValid(): boolean;
  fetchSourcesForAddress(address: string): SourceInfo | null;
}

interface SourceInfo {
  sources: SourcesByPath;
  options: SolcOptions;
}

interface SourcesByPath {
  [sourcePath: string]: string;
}

//apologies if reinventing the wheel here
interface SolcOptions {
  version: string;
  settings: SolcSettings;
}

//only including settings that would alter compiled result
interface SolcSettings {
  remappings?: string[];
  optimizer?: OptimizerSettings;
  evmVersion: string; //not gonna enumerate these
  debug?: DebugSettings;
  metadata?: MetadataSettings;
  libraries: LibrarySettings;
}

interface LibrarySettings {
  [contractPath: string]: {
    [libraryName: string]: string;
  };
}

interface MetadataSettings {
  useLiteralContent?: boolean;
  bytecodeHash?: "none" | "ipfs" | "bzzr1";
}

interface DebugSettings {
  revertStrings?: "default" | "strip" | "debug" | "verboseDebug";
}

interface OptimizerSettings {
  enabled?: boolean;
  runs?: number;
  details?: OptimizerDetails;
}

interface OptimizerDetails {
  peephole?: boolean;
  jumpdestRemover?: boolean;
  orderLiterals?: boolean;
  deduplicate?: boolean;
  cse?: boolean;
  constantOptimizer?: boolean;
  yul?: boolean;
  yulDetails?: YulDetails;
}

interface YulDetails {
  stackAllocation?: boolean;
  optimizerSteps?: string;
}
