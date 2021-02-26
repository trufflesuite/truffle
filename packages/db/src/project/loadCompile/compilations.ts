/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:project:loadCompile:compilations");

import type { ImmutableReferences } from "@truffle/contract-schema/spec";

import type { DataModel, Input, IdObject } from "@truffle/db/resources";
import { resources } from "@truffle/db/process";
import * as Batch from "./batch";

interface Contract {
  sourcePath: string;
  ast: any;
  sourceMap: string;
  deployedSourceMap: string;
  immutableReferences: ImmutableReferences;

  db: {
    source: IdObject<"sources">;
    callBytecode: IdObject<"bytecodes">;
    createBytecode: IdObject<"bytecodes">;
  };
}

interface Source {
  sourcePath: string;
  contents: string;
  language: string;
  ast: any;
  legacyAST: any;

  db: { source: IdObject<"sources"> };
}

export const process = Batch.Compilations.configure<{
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
    compilation: IdObject<"compilations"> | undefined;
  };
  entry: Input<"compilations">;
  result: IdObject<"compilations"> | undefined;
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

  convert({ result, input: compilation }) {
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
}): Input<"compilations"> {
  const { compiler } = options;

  return {
    compiler,
    processedSources: toProcessedSourceInputs(options),
    sources: toSourceInputs(options),
    sourceMaps: toSourceMapInputs(options),
    immutableReferences: toImmutableReferencesInputs(options)
  };
}

function toProcessedSourceInputs(options: {
  sources: Source[];
  sourceIndexes: string[];
}): (DataModel.ProcessedSourceInput | null)[] {
  return options.sourceIndexes.map(sourcePath => {
    const source = options.sources.find(
      source => source.sourcePath === sourcePath
    );

    if (!source) {
      return null;
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
}): (IdObject<"sources"> | null)[] {
  return options.sourceIndexes.map(sourcePath => {
    const compiledSource = options.sources.find(
      source => source.sourcePath === sourcePath
    );

    if (!compiledSource) {
      return null;
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
      const sourceMaps: DataModel.SourceMapInput[] = [];

      if (contract.sourceMap && contract.db.createBytecode) {
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

function toImmutableReferencesInputs(options: {
  contracts: Contract[];
}): DataModel.ImmutableReferenceInput[] {
  const immutableReferences: DataModel.ImmutableReferenceInput[] = options.contracts
    .filter(contract => contract)
    .filter(({ immutableReferences = {} }) => {
      return Object.keys(immutableReferences).length > 0;
    })
    .map(contract => {
      return Object.entries(contract.immutableReferences)
        .map(([astNode, slices]):
          | DataModel.ImmutableReferenceInput
          | undefined => {
          // HACK start/length might actually be required, but contract-schema
          // is wrong?
          const definedSlices = slices.filter(
            (slice): slice is { start: number; length: number } =>
              typeof slice.start === "number" &&
              typeof slice.length === "number"
          );

          if (definedSlices.length === 0) {
            return;
          }

          return {
            astNode,
            bytecode: contract.db.callBytecode,
            length: definedSlices[0].length,
            offsets: definedSlices.map(({ start }) => start)
          };
        })
        .filter(
          (
            immutableReference
          ): immutableReference is DataModel.ImmutableReferenceInput =>
            !!immutableReference
        );
    })
    .flat();

  return immutableReferences;
}
