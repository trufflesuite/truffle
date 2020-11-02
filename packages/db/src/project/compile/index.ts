import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:commands:compile");

import * as Common from "@truffle/compile-common/src/types";
import { Process } from "@truffle/db/project/process";
import { IdObject } from "@truffle/db/meta";

import { generateCompilationsSourcesLoad } from "./sources";
import { generateCompilationsBytecodesLoad } from "./bytecodes";
import { generateCompilationsInputLoad } from "./compilations";
import { generateCompilationsContractsLoad } from "./contracts";

export type Contract = Common.CompiledContract & {
  db: {
    contract: IdObject<DataModel.Contract>;
  };
};

export type Compilation = Common.Compilation & {
  contracts: Contract[];
  db: {
    compilation: IdObject<DataModel.Compilation>;
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
  const withSources = yield* generateCompilationsSourcesLoad(
    result.compilations
  );

  const withSourcesAndBytecodes = yield* generateCompilationsBytecodesLoad(
    withSources
  );

  const withCompilations = yield* generateCompilationsInputLoad(
    withSourcesAndBytecodes
  );

  const withContracts = yield* generateCompilationsContractsLoad(
    withCompilations
  );

  const compilations = (withContracts as unknown) as Compilation[];

  return {
    compilations,
    contracts: compilations.reduce(
      (a, { contracts }) => [...a, ...contracts],
      []
    )
  };
}
