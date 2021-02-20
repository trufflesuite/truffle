import { Resources } from "@truffle/db";
import type { ProjectInfo } from "@truffle/decoder";

export interface PrepareProjectInfoOptions {
  compilations: Resources.Resource<"compilations">[];
}

export async function prepareProjectInfo({
  compilations
}: PrepareProjectInfoOptions): Promise<ProjectInfo> {
  return {
    compilations: compilations.map(compilation => ({
      id: compilation.id,

      // compiler
      compiler: compilation.compiler,

      // sources
      sources: compilation.processedSources.map(
        ({ ast, source: { id, contents: source, sourcePath }, language }) => ({
          ast: JSON.parse(ast.json),
          compiler: compilation.compiler,
          id,
          language,
          source,
          sourcePath
        })
      ),

      // contracts
      contracts: compilation.contracts.map(
        ({
          name,
          abi,
          processedSource: { source },
          callBytecode,
          createBytecode
        }) => ({
          abi: JSON.parse(abi.json),
          bytecode: `0x${createBytecode.bytes}`,
          deployedBytecode: `0x${callBytecode.bytes}`,
          immutableReferences: findImmutableReferences(
            compilation.immutableReferences,
            callBytecode
          ),

          compiler: compilation.compiler,
          contractName: name,
          primarySourceId: source.id,
          sourceMap: findSourceMap(compilation.sourceMaps, createBytecode),
          deployedSourceMap: findSourceMap(compilation.sourceMaps, callBytecode)
        })
      )
    }))
  };
}

function findSourceMap(sourceMaps, bytecode) {
  const sourceMap = sourceMaps.find(
    sourceMap => sourceMap && sourceMap.bytecode.id === bytecode.id
  );
  return sourceMap && sourceMap.data;
}

function findImmutableReferences(immutableReferences, bytecode) {
  const forBytecode = immutableReferences.filter(
    ({ bytecode: { id } }) => id === bytecode.id
  );

  const mapped = forBytecode.map(({ astNode, length, offsets }) => ({
    [astNode]: offsets.map(start => ({ start: start, length }))
  }));

  return mapped.reduce((a, b) => ({ ...a, ...b }), {});
}
