import { logger } from "@truffle/db/logger";
const debug = logger("db:project:compile:compilations");

import { DataModel, IdObject, resources } from "@truffle/db/project/process";
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

interface Source {
  sourcePath: string;
  contents: string;
  language: string;
  ast: any;
  legacyAST: any;

  db: { source: IdObject<DataModel.Source> };
}

export const generateCompilationsLoad = Batch.Compilations.generate<{
  compilation: {
    compiler: {
      name: string;
      version: string;
    };
    sources: {};
    sourceIndexes: string[];
  };
  source: Source;
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
      sourceIndexes: input.sourceIndexes,
      sources: input.sources
    });
  },

  *process({ entries }) {
    debug("entries %o", entries);
    return yield* resources.load("compilations", entries);
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
  sources: Source[];
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
  sources: Source[];
  sourceIndexes: string[];
}): DataModel.ProcessedSourceInput[] {
  return options.sourceIndexes.map(sourcePath => {
    const source = options.sources.find(
      source => source.sourcePath === sourcePath
    );

    if (!source) {
      return;
    }

    const ast = source.ast ? { json: JSON.stringify(source.ast) } : undefined;
    const language = source.language;

    return {
      source: source.db.source,
      ast,
      language
    };
  });
}

function toSourceInputs(options: {
  sources: Source[];
  sourceIndexes: string[];
}): IdObject<DataModel.Source>[] {
  return options.sourceIndexes.map(sourcePath => {
    const compiledSource = options.sources.find(
      source => source.sourcePath === sourcePath
    );

    if (!compiledSource) {
      return;
    }

    const {
      db: { source }
    } = compiledSource;

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
