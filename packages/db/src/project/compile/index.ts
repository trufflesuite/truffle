import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:commands:compile");

import * as Common from "@truffle/compile-common/src/types";
import { DataModel, IdObject, Process } from "@truffle/db/project/process";

import { generateSourcesLoad } from "./sources";
import { generateBytecodesLoad } from "./bytecodes";
import { generateCompilationsLoad } from "./compilations";
import { generateContractsLoad } from "./contracts";

export type Compilation = Common.Compilation & {
  contracts: Contract[];
  sources: Source[];
  compiler: { name: string; version: string };
  db: {
    compilation: IdObject<DataModel.Compilation>;
  };
};

export type Source = Common.Source & {
  db: { source: IdObject<DataModel.Source> };
};

export type Contract = Common.CompiledContract & {
  db: {
    contract: IdObject<DataModel.Contract>;
    source: IdObject<DataModel.Source>;
    callBytecode: IdObject<DataModel.Bytecode>;
    createBytecode: IdObject<DataModel.Bytecode>;
  };
};

/**
 * For a compilation result from @truffle/workflow-compile/new, generate a
 * sequence of GraphQL requests to submit to Truffle DB
 *
 * Returns a generator that yields requests to forward to Truffle DB.
 * When calling `.next()` on this generator, pass any/all responses
 * and ultimately returns nothing when complete.
 */
export function* generateCompileLoad(
  result: Common.WorkflowCompileResult
): Process<{
  compilations: Compilation[];
  contracts: Contract[];
}> {
  // @ts-ignore
  const withSources = yield* generateSourcesLoad(result.compilations);

  const withSourcesAndBytecodes = yield* generateBytecodesLoad(withSources);

  // @ts-ignore
  const withCompilations = yield* generateCompilationsLoad(withSourcesAndBytecodes
  );

  const withContracts = yield* generateContractsLoad(withCompilations);

  const compilations = withContracts;

  // @ts-ignore
  return {compilations,
    contracts: compilations.reduce(
      (a, { contracts }) => [...a, ...contracts],
      []
    )
  };
}
