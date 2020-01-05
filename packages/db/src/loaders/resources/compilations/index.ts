import {
  CompilationData,
  IdObject,
  WorkspaceRequest,
  WorkspaceResponse
} from "@truffle/db/loaders/types";

import { AddCompilations } from "./add.graphql";
export { AddCompilations };

const compilationCompilerInput = ({
  compilation: { contracts }
}: {
  compilation: CompilationData;
}): DataModel.ICompilerInput => ({
  name: contracts[0].compiler.name,
  version: contracts[0].compiler.version
});

const compilationProcessedSourceInputs = ({
  compilation: { contracts },
  sources
}: {
  compilation: CompilationData;
  sources: IdObject<DataModel.ISource>[];
}): DataModel.ICompilationProcessedSourceInput[] =>
  contracts.map(({ contractName: name, ast }, index) => ({
    name,
    source: sources[index],
    ast: ast ? { json: JSON.stringify(ast) } : undefined
  }));

const compilationInput = ({
  compilation,
  sources
}: {
  compilation: CompilationData;
  sources: IdObject<DataModel.ISource>[];
}): DataModel.ICompilationInput => {
  const compiler = compilationCompilerInput({ compilation });
  const processedSources = compilationProcessedSourceInputs({
    compilation,
    sources
  });

  if (compiler.name === "solc") {
    return {
      compiler,
      processedSources,
      sources,
      sourceMaps: compilation.contracts.map(({ sourceMap: json }) => ({ json }))
    };
  } else {
    return {
      compiler,
      processedSources,
      sources
    };
  }
};

type LoadableCompilation = {
  compilation: CompilationData;
  sources: IdObject<DataModel.ISource>[];
};

export function* generateCompilationsLoad(
  loadableCompilations: LoadableCompilation[]
): Generator<
  WorkspaceRequest,
  DataModel.ICompilation[],
  WorkspaceResponse<"compilationsAdd", DataModel.ICompilationsAddPayload>
> {
  const compilations = loadableCompilations.map(compilationInput);

  const result = yield {
    request: AddCompilations,
    variables: { compilations }
  };

  return result.data.workspace.compilationsAdd.compilations;
}
