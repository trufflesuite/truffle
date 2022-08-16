import type * as Hardhat from "hardhat/types";

import type { Compilation, CompiledContract } from "@truffle/compile-common";
import * as CompileSolidity from "@truffle/compile-solidity";

export const fromBuildInfo = (buildInfo: Hardhat.BuildInfo): Compilation => {
  const sourceIndexes = SourceIndexes.fromBuildInfo(buildInfo);

  return {
    sourceIndexes,
    sources: Sources.fromBuildInfo(buildInfo, sourceIndexes),
    contracts: Contracts.fromBuildInfo(buildInfo),
    compiler: {
      name: "solc",
      version: buildInfo.solcLongVersion
    }
  };
};

namespace SourceIndexes {
  export const fromBuildInfo = (
    buildInfo: Hardhat.BuildInfo
  ): Compilation["sourceIndexes"] => {
    const sourceIndexes = [];
    for (const { index, sourcePath } of Object.entries(
      buildInfo.output.sources
    ).map(([sourcePath, source]) => ({ index: source.id, sourcePath }))) {
      sourceIndexes[index] = sourcePath;
    }

    return sourceIndexes;
  };
}

namespace Sources {
  export const fromBuildInfo = (
    buildInfo: Hardhat.BuildInfo,
    sourceIndexes: Compilation["sourceIndexes"]
  ): Compilation["sources"] =>
    sourceIndexes.map(sourcePath => {
      const inputSource = buildInfo.input.sources[sourcePath];
      const outputSource = buildInfo.output.sources[sourcePath];

      return {
        sourcePath,
        contents: inputSource.content,
        ast: outputSource.ast,
        language: buildInfo.input.language
      };
    });
}

namespace Contracts {
  export const fromBuildInfo = (
    buildInfo: Hardhat.BuildInfo
  ): CompiledContract[] => {
    const contracts = [];
    for (const [sourcePath, sourceContracts] of Object.entries(
      buildInfo.output.contracts
    )) {
      for (const [contractName, compilerOutputContract] of Object.entries(
        sourceContracts
      )) {
        const contract: CompiledContract = {
          contractName,
          sourcePath,
          source: buildInfo.input.sources[sourcePath].content,
          sourceMap: compilerOutputContract.evm.bytecode.sourceMap,
          deployedSourceMap:
            compilerOutputContract.evm.deployedBytecode.sourceMap,
          legacyAST: undefined,
          ast: buildInfo.output.sources[sourcePath].ast,
          abi: compilerOutputContract.abi,
          metadata: (compilerOutputContract as any).metadata,
          bytecode: CompileSolidity.Shims.zeroLinkReferences({
            bytes: compilerOutputContract.evm.bytecode.object,
            linkReferences: CompileSolidity.Shims.formatLinkReferences(
              compilerOutputContract.evm.bytecode.linkReferences
            )
          }),
          deployedBytecode: CompileSolidity.Shims.zeroLinkReferences({
            bytes: compilerOutputContract.evm.deployedBytecode.object,
            linkReferences: CompileSolidity.Shims.formatLinkReferences(
              compilerOutputContract.evm.deployedBytecode.linkReferences
            )
          }),
          compiler: {
            name: "solc",
            version: buildInfo.solcLongVersion
          },
          devdoc: undefined,
          userdoc: undefined,
          immutableReferences:
            compilerOutputContract.evm.deployedBytecode.immutableReferences,
          generatedSources: (compilerOutputContract.evm.bytecode as any)
            .generatedSources,
          deployedGeneratedSources: (
            compilerOutputContract.evm.deployedBytecode as any
          ).generatedSources
        };

        contracts.push(contract);
      }
    }

    return contracts;
  };
}
