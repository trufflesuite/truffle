import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:commands:compile:compilations");

import { IdObject } from "@truffle/db/meta";
import {
  resources,
  Process,
  PrepareBatch,
  _
} from "@truffle/db/project/process";

interface Contract {
  ast: any;
  sourcePath: string;
  sourceMap: any;
  deployedSourceMap: any;

  abi: any;
  contractName: any;

  db: {
    source: IdObject<DataModel.Source>;
    callBytecode: IdObject<DataModel.Bytecode>;
    createBytecode: IdObject<DataModel.Bytecode>;
  };
}

interface Compilation {
  compiler: {
    name: string;
    version: string;
  };
  sourceIndexes: string[];
  contracts: Contract[];
}

export function* generateCompilationsInputLoad(
  compilations: Compilation[]
): Process<
  (Compilation & {
    contracts: (Contract & {
      compilation: IdObject<DataModel.Compilation>;
    })[];

    db: {
      compilation: IdObject<DataModel.Compilation>;
    };
  })[]
> {
  const { batch, unbatch } = prepareCompilationsBatch(compilations);

  const results = yield* resources.load("compilations", batch);

  return unbatch(results);
}

const prepareCompilationsBatch: PrepareBatch<
  _[],
  Compilation,
  Compilation & {
    contracts: (Contract & {
      compilation: IdObject<DataModel.Compilation>;
    })[];

    db: {
      compilation: IdObject<DataModel.Compilation>;
    };
  },
  DataModel.CompilationInput,
  IdObject<DataModel.Compilation>
> = structured => {
  const batch = [];
  const breadcrumbs: {
    [index: number]: {
      compilationIndex: number;
    };
  } = {};

  for (const [compilationIndex, compilation] of structured.entries()) {
    breadcrumbs[batch.length] = { compilationIndex };

    batch.push(toCompilationInput(compilation));
  }

  const unbatch = results => {
    const compilations = [];

    for (const [index, result] of results.entries()) {
      const { compilationIndex } = breadcrumbs[index];

      compilations[compilationIndex] = {
        ...structured[compilationIndex],
        contracts: structured[compilationIndex].contracts.map(contract => ({
          ...contract,
          db: {
            ...contract.db,
            compilation: result
          }
        })),
        db: {
          compilation: result
        }
      };
    }

    return compilations;
  };

  return { batch, unbatch };
};

function toCompilationInput(options: {
  compiler: DataModel.CompilerInput;
  contracts: Contract[];
  sourceIndexes: string[];
}): DataModel.CompilationInput {
  const { compiler } = options;

  return {
    compiler,
    processedSources: toProcessedSourceInputs(options),
    sources: toSourceInputs(options),
    sourceMaps: toSourceMapInputs(options)
  };
}

function toProcessedSourceInputs(options: {
  contracts: Contract[];
  sourceIndexes: string[];
}): DataModel.ProcessedSourceInput[] {
  debug("options %o", options);
  return options.sourceIndexes.map(sourcePath => {
    const contract = options.contracts.find(
      contract => contract.sourcePath === sourcePath
    );

    if (!contract) {
      return;
    }

    const { source } = contract.db;

    const ast = contract.ast
      ? { json: JSON.stringify(contract.ast) }
      : undefined;

    return {
      source,
      ast
    };
  });
}

function toSourceInputs(options: {
  contracts: Contract[];
  sourceIndexes: string[];
}): IdObject<DataModel.Source>[] {
  return options.sourceIndexes.map(sourcePath => {
    const contract = options.contracts.find(
      contract => contract.sourcePath === sourcePath
    );

    if (!contract) {
      return;
    }

    const {
      db: { source }
    } = contract;

    return source;
  });
}

function toSourceMapInputs(options: {
  contracts: Contract[];
}): DataModel.SourceMapInput[] {
  return options.contracts
    .map(contract => {
      const sourceMaps = [];

      if (contract.sourceMap) {
        sourceMaps.push({
          bytecode: contract.db.createBytecode,
          data: contract.sourceMap
        });
      }

      if (contract.deployedSourceMap) {
        sourceMaps.push({
          bytecode: contract.db.callBytecode,
          data: contract.deployedSourceMap
        });
      }

      return sourceMaps;
    })
    .flat();
}
