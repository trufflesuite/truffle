import { logger } from "@truffle/db/logger";
const debug = logger("db:project:compile:compilations");

import { IdObject, resources } from "@truffle/db/project/process";
import * as Batch from "./batch";

interface Contract {
  sourcePath: string;
  ast: any;
  sourceMap: string;
  deployedSourceMap: string;

  db: {
    source: IdObject<DataModel.Source>;
    callBytecode: IdObject<DataModel.Bytecode>;
    createBytecode: IdObject<DataModel.Bytecode>;
  };
}

export const generateCompilationsInputLoad = Batch.Compilations.generate<{
  compilation: {
    compiler: {
      name: string;
      version: string;
    };
    sourceIndexes: string[];
  };
  contract: Contract;
  resources: {
    compilation: IdObject<DataModel.Compilation>;
  };
  entry: DataModel.CompilationInput;
  result: IdObject<DataModel.Compilation>;
}>({
  extract({ input }) {
    return toCompilationInput({
      compiler: input.compiler,
      contracts: input.contracts,
      sourceIndexes: input.sourceIndexes
    });
  },

  *process({ batch }) {
    return yield* resources.load("compilations", batch);
  },

  convert<_I, _O>({ result, input: compilation }) {
    return {
      ...compilation,
      db: {
        ...(compilation.db || {}),
        compilation: result
      }
    };
  }
});

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
