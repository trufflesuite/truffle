/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:project:loadCompile");

import type * as Common from "@truffle/compile-common";
import type { IdObject } from "@truffle/db/resources";
import type { Process } from "@truffle/db/process";

import * as Batch from "./batch";
export { Batch };

import * as AddSources from "./sources";
import * as AddBytecodes from "./bytecodes";
import * as AddCompilations from "./compilations";
import * as AddContracts from "./contracts";
export { AddSources, AddBytecodes, AddCompilations, AddContracts };

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
export function* process(
  result: Common.WorkflowCompileResult
): Process<{
  compilations: Compilation[];
  contracts: Contract[];
}> {
  const withSources = yield* AddSources.process(result.compilations);

  // @ts-ignore
  const withSourcesAndBytecodes = yield* AddBytecodes.process(withSources);

  const withCompilations = yield* AddCompilations.process(
    // @ts-ignore
    withSourcesAndBytecodes
  );

  // @ts-ignore
  const withContracts = yield* AddContracts.process(withCompilations);

  const compilations = withContracts;

  return {
    // @ts-ignore
    compilations,
    contracts: compilations.reduce(
      (a, { contracts }) => [...a, ...contracts] as Contract[],
      []
    )
  };
}
