import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:types");

import { CompiledContract } from "@truffle/compile-common";
import { IdObject } from "@truffle/db/meta";

export interface SourceData {
  index: number;
  input: DataModel.SourceInput;
  contracts: CompiledContract[];
}

export interface LoadedSources {
  [sourcePath: string]: IdObject<DataModel.Source>;
}

// we track loaded bytecodes using the same structure as CompilationData:
// - order sources
// - order contracts for each source
// - capture bytecodes for each contract
export interface LoadedBytecodes {
  sources: {
    contracts: {
      createBytecode: IdObject<DataModel.Bytecode>;
      callBytecode: IdObject<DataModel.Bytecode>;
    }[];
  }[];
}
