import { Compilation, IdObject, Request } from "truffle-db/loaders/types";

import { AddCompilations } from "./add.graphql";
export { AddCompilations };

const compilationCompilerInput = ({
  compilation: { contracts }
}: {
  compilation: Compilation;
}): DataModel.ICompilerInput => ({
  name: contracts[0].compiler.name,
  version: contracts[0].compiler.version
});

const compilationSourceContractInputs = ({
  compilation: { contracts },
  sources
}: {
  compilation: Compilation;
  sources: IdObject[];
}): DataModel.ICompilationSourceContractInput[] =>
  contracts.map(({ contractName: name, ast }, index) => ({
    name,
    source: sources[index],
    ast: ast ? { json: JSON.stringify(ast) } : undefined
  }));

const compilationInput = ({
  compilation,
  sources
}: {
  compilation: Compilation;
  sources: IdObject[];
}): DataModel.ICompilationInput => {
  const compiler = compilationCompilerInput({ compilation });
  const contracts = compilationSourceContractInputs({ compilation, sources });

  if (compiler.name === "solc") {
    return {
      compiler,
      contracts,
      sources,
      sourceMaps: compilation.contracts.map(({ sourceMap: json }) => ({ json }))
    };
  } else {
    return {
      compiler,
      contracts,
      sources
    };
  }
};

interface LoadableCompilation {
  compilation: Compilation;
  sources: IdObject[];
}

interface LoadedCompilation {
  id: string;
  compiler: DataModel.ICompiler;
}

interface CompilationsAddResponse {
  data: {
    workspace: {
      compilationsAdd: DataModel.ICompilationsAddPayload;
    };
  };
}

export function* generateCompilationsLoad(
  loadableCompilations: LoadableCompilation[]
): Generator<Request, LoadedCompilation[], CompilationsAddResponse> {
  const compilations = loadableCompilations.map(compilationInput);

  const result = yield {
    mutation: AddCompilations,
    variables: { compilations }
  };

  // return only array of objects { id }
  return result.data.workspace.compilationsAdd.compilations.map(
    ({ id, compiler }) => ({ id, compiler })
  );
}
