import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:commands:compile");

import * as Common from "@truffle/compile-common/src/types";
import { IdObject } from "@truffle/db/project/process";

import { generateCompilationsSourcesLoad } from "./sources";
import { generateCompilationsBytecodesLoad } from "./bytecodes";
import { generateCompilationsInputLoad } from "./compilations";
import { generateCompilationsContractsLoad } from "./contracts";

export type Compilation = Common.Compilation & {
  contracts: Contract[];
  db: {
    compilation: IdObject<DataModel.Compilation>;
  };
};

export type Contract = Common.CompiledContract & {
  db: {
    contract: IdObject<DataModel.Contract>;
    source: IdObject<DataModel.Source>;
    callBytecode: IdObject<DataModel.Source>;
    createBytecode: IdObject<DataModel.Bytecode>;
  };
};

type WithSources = (Common.Compilation & {
  contracts: (Common.CompiledContract & {
    db?: {
      source: IdObject<DataModel.Source>;
    };
  })[];
})[];

type WithBytecodes = {
  contracts: {
    db?: {
      callBytecode: IdObject<DataModel.Bytecode>;
      createBytecode: IdObject<DataModel.Bytecode>;
    };
  }[];
}[];

type WithCompilations = (Common.Compilation & {
  contracts: (Common.CompiledContract & {
    db?: {};
  })[];
  db?: {
    compilation: IdObject<DataModel.Compilation>;
  };
})[];

type WithContracts = {
  contracts: {
    db?: {
      contract: IdObject<DataModel.Contract>;
    };
  }[];
}[];

/**
 * For a compilation result from @truffle/workflow-compile/new, generate a
 * sequence of GraphQL requests to submit to Truffle DB
 *
 * Returns a generator that yields requests to forward to Truffle DB.
 * When calling `.next()` on this generator, pass any/all responses
 * and ultimately returns nothing when complete.
 */
export function* generateCompileLoad(result: Common.WorkflowCompileResult) {
  const withSources = yield* generateCompilationsSourcesLoad(result.compilations);

  const withSourcesAndBytecodes = yield* generateCompilationsBytecodesLoad(withSources);

  const withCompilations = yield* generateCompilationsInputLoad(withSourcesAndBytecodes);

  const withContracts = yield* generateCompilationsContractsLoad(withCompilations);

  const compilations: Common.Compilation[] &
    WithSources &
    WithBytecodes &
    WithCompilations &
    WithContracts = withContracts;

  return {
    compilations,
    contracts: compilations.reduce(
      (a, { contracts }) => [...a, ...contracts],
      []
    )
  };
}
