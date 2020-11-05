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
    db: {
      source: IdObject<DataModel.Source>;
    };
  })[];
})[];

type WithBytecodes = {
  contracts: {
    db: {
      callBytecode: IdObject<DataModel.Bytecode>;
      createBytecode: IdObject<DataModel.Bytecode>;
    };
  }[];
}[];

type WithCompilations = (Common.Compilation & {
  contracts: (Common.CompiledContract & {
    db: {};
  })[];
  db: {
    compilation: IdObject<DataModel.Compilation>;
  };
})[];

type WithContracts = {
  contracts: {
    db: {
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
  const inputs = result.compilations.map(compilation => ({
    ...compilation,
    contracts: compilation.contracts.map(contract => ({
      ...contract,
      db: {
        ...(contract.db || {})
      }
    })),
    db: {
      ...(compilation.db || {})
    }
  }));
  const withSources = yield* generateCompilationsSourcesLoad(inputs);

  const withSourcesAndBytecodes = yield* generateCompilationsBytecodesLoad(
    withSources
  );

  const withCompilations = yield* generateCompilationsInputLoad(
    withSourcesAndBytecodes
  );

  const withContracts = yield* generateCompilationsContractsLoad<
    Common.Compilation[] & WithSources & WithBytecodes & WithCompilations,
    Common.Compilation[] &
      WithSources &
      WithBytecodes &
      WithCompilations &
      WithContracts
  >(withCompilations);

  const compilations = withContracts;

  return {
    compilations,
    contracts: compilations.reduce(
      (a, { contracts }) => [...a, ...contracts],
      []
    )
  };
}
