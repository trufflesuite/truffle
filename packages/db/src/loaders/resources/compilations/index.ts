import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:compilations");

import { generate } from "@truffle/db/generate";
import { CompilationData, LoadedSources } from "@truffle/db/loaders/types";
import { Process } from "@truffle/db/resources";

const compilationSourceInputs = ({
  compilation,
  sources
}: LoadableCompilation): DataModel.ResourceReferenceInput[] =>
  compilation.sources.map(({ input: { sourcePath } }) => sources[sourcePath]);

const compilationProcessedSourceInputs = ({
  compilation,
  sources
}: LoadableCompilation): DataModel.ProcessedSourceInput[] =>
  compilation.sources.map(({ input: { sourcePath }, contracts }) => ({
    source: sources[sourcePath],
    // PRECONDITION: all contracts in the same compilation with the same
    // sourcePath must have the same AST
    ast: contracts[0].ast
      ? { json: JSON.stringify(contracts[0].ast) }
      : undefined
  }));

const compilationSourceMapInputs = ({
  compilation
}: LoadableCompilation): DataModel.SourceMapInput[] => {
  const contracts = compilation.sources
    .map(({ contracts }) => contracts)
    .flat();

  const sourceMaps = contracts
    .map(({ sourceMap, deployedSourceMap }) => [sourceMap, deployedSourceMap])
    .flat()
    .filter(Boolean);

  if (sourceMaps.length) {
    return sourceMaps.map(sourceMap => ({ json: sourceMap }));
  }
};

const compilationInput = (
  data: LoadableCompilation
): DataModel.CompilationInput => ({
  compiler: data.compilation.compiler,
  processedSources: compilationProcessedSourceInputs(data),
  sources: compilationSourceInputs(data),
  sourceMaps: compilationSourceMapInputs(data)
});

type LoadableCompilation = {
  compilation: CompilationData;
  sources: LoadedSources;
};

export function* generateCompilationsLoad(
  loadableCompilations: LoadableCompilation[]
): Process<DataModel.Compilation[]> {
  const inputs = loadableCompilations.map(compilationInput);

  const compilations = yield* generate.load("compilations", inputs);

  return compilations;
}
