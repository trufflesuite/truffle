import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:commands:compile");

import * as Common from "@truffle/compile-common/src/types";
import { IdObject } from "@truffle/db/resources";
import { Process } from "@truffle/db/process";

import { generateSourcesLoad } from "./sources";
import { generateBytecodesLoad } from "./bytecodes";
import { generateCompilationsLoad } from "./compilations";
import { generateContractsLoad } from "./contracts";

export type Compilation = Common.Compilation & {
  contracts: Contract[];
  sources: Source[];
  compiler: { name: string; version: string };
  db: {
    compilation: IdObject<"compilations">;
  };
};

export type Source = Common.Source & {
  db: { source: IdObject<"sources"> };
};

export type Contract = Common.CompiledContract & {
  db: {
    contract: IdObject<"contracts">;
    source: IdObject<"sources">;
    callBytecode: IdObject<"bytecodes">;
    createBytecode: IdObject<"bytecodes">;
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

  const withCompilations = yield* generateCompilationsLoad(
    // @ts-ignore
    withSourcesAndBytecodes
  );

  const withContracts = yield* generateContractsLoad(withCompilations);

  const compilations = withContracts;

  return {
    // @ts-ignore
    compilations,
    contracts: compilations.reduce(
      (a, { contracts }) => [...a, ...contracts],
      []
    )
  };
}
