import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:commands:compile:sources");

import { IdObject } from "@truffle/db/meta";
import { Process, resources } from "@truffle/db/project/process";
import { PrepareBatch, _ } from "@truffle/db/loaders/batch";

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
  }
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
    db: {
      compilation: IdObject<DataModel.Compilation>;
    }
  })[]
> {
  const { batch, unbatch } = prepareCompilationsBatch(compilations);

  const results = yield* resources.load("compilations", batch);

  return unbatch(results);
}

const prepareCompilationsBatch: PrepareBatch<
  _[],
  Compilation,
  Compilation & { db: { compilation: IdObject<DataModel.Compilation> } },
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
  return options.sourceIndexes.map(sourcePath => {
    const contract = options.contracts.find(
      contract => contract.sourcePath === sourcePath
    );

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
    const { db: { source } } = options.contracts.find(
      contract => contract.sourcePath === sourcePath
    );

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
          json: contract.sourceMap
        });
      }

      if (contract.deployedSourceMap) {
        sourceMaps.push({
          json: contract.deployedSourceMap
        });
      }

      return sourceMaps;
    })
    .flat();
}
