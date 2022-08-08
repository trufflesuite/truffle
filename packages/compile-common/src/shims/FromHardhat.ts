import type * as Hardhat from "hardhat/types";

import type {
  Compilation,
  CompiledContract,
  Bytecode,
  LinkReference
} from "../types";

const supportedFormats = new Set(["hh-sol-build-info-1"]);

export function buildInfoCompilation(
  buildInfo: Hardhat.BuildInfo
): Compilation {
  const { _format } = buildInfo;

  if (!supportedFormats.has(_format)) {
    throw new Error(`Unsupported build info format: ${_format}`);
  }

  const sourceIndexes = buildInfoSourceIndexes(buildInfo);

  return {
    sourceIndexes,
    sources: buildInfoSources(buildInfo, sourceIndexes),
    contracts: buildInfoContracts(buildInfo),
    compiler: {
      name: "solc",
      version: buildInfo.solcLongVersion
    }
  };
}

function buildInfoSourceIndexes(
  buildInfo: Hardhat.BuildInfo
): Compilation["sourceIndexes"] {
  const sourceIndexes = [];
  for (const { index, sourcePath } of Object.entries(
    buildInfo.output.sources
  ).map(([sourcePath, source]) => ({ index: source.id, sourcePath }))) {
    sourceIndexes[index] = sourcePath;
  }

  return sourceIndexes;
}

function buildInfoSources(
  buildInfo: Hardhat.BuildInfo,
  sourceIndexes: Compilation["sourceIndexes"]
): Compilation["sources"] {
  return sourceIndexes.map(sourcePath => {
    // to handle if sourceIndexes is a sparse array
    if (!sourcePath) {
      return;
    }

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

function buildInfoContracts(buildInfo: Hardhat.BuildInfo): CompiledContract[] {
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
        bytecode: zeroLinkReferences({
          bytes: compilerOutputContract.evm.bytecode.object,
          linkReferences: formatLinkReferences(
            compilerOutputContract.evm.bytecode.linkReferences
          )
        }),
        deployedBytecode: zeroLinkReferences({
          bytes: compilerOutputContract.evm.deployedBytecode.object,
          linkReferences: formatLinkReferences(
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
}

// HACK stolen from compile-solidity
function formatLinkReferences(
  linkReferences: Hardhat.CompilerOutputBytecode["linkReferences"]
): LinkReference[] {
  if (!linkReferences) {
    return [];
  }

  // convert to flat list
  const libraryLinkReferences = Object.values(linkReferences)
    .map(fileLinks =>
      Object.entries(fileLinks).map(([name, links]) => ({
        name,
        links
      }))
    )
    .reduce((a, b) => [...a, ...b], []);

  // convert to { offsets, length, name } format
  return libraryLinkReferences.map(({ name, links }) => ({
    offsets: links.map(({ start }) => start),
    length: links[0].length, // HACK just assume they're going to be the same
    name
  }));
}

// HACK stolen from compile-solidity
// takes linkReferences in output format (not Solidity's format)
function zeroLinkReferences({
  bytes,
  linkReferences
}: {
  bytes: string;
  linkReferences: LinkReference[];
}): Bytecode {
  if (bytes === undefined) {
    return undefined;
  }
  // inline link references - start by flattening the offsets
  const flattenedLinkReferences = linkReferences
    // map each link ref to array of link refs with only one offset
    .map(({ offsets, length, name }) =>
      offsets.map(offset => ({ offset, length, name }))
    )
    // flatten
    .reduce((a, b) => [...a, ...b], []);

  // then overwite bytes with zeroes
  bytes = flattenedLinkReferences.reduce((bytes, { offset, length }) => {
    // length is a byte offset
    const characterLength = length * 2;
    const start = offset * 2;

    const zeroes = "0".repeat(characterLength);

    return `${bytes.substring(0, start)}${zeroes}${bytes.substring(
      start + characterLength
    )}`;
  }, bytes);

  return { bytes, linkReferences };
}
