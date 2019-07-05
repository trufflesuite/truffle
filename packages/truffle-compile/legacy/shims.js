function shimOutput({ contracts: list, sourceIndexes, compilerInfo }) {
  const contracts = list
    // get old format
    .map(contract => shimContract(contract))
    // get pair
    .map(contract => ({ [contract.contract_name]: contract }))
    // merge pairs
    .reduce((a, b) => Object.assign({}, a, b), {});

  return [contracts, sourceIndexes, compilerInfo];
}

function shimContract(contract) {
  const {
    contractName,
    sourcePath,
    source,
    sourceMap,
    deployedSourceMap,
    legacyAST,
    ast,
    abi,
    metadata,
    bytecode,
    deployedBytecode,
    compiler,
    devdoc,
    userdoc
  } = contract;

  return {
    contract_name: contractName,
    sourcePath,
    source,
    sourceMap,
    deployedSourceMap,
    legacyAST,
    ast,
    abi,
    metadata,
    bytecode: shimBytecode(bytecode),
    deployedBytecode: shimBytecode(deployedBytecode),
    unlinked_binary: shimBytecode(bytecode),
    compiler,
    devdoc,
    userdoc
  };
}

function shimBytecode({ bytes, linkReferences }) {
  linkReferences = linkReferences || [];

  // inline link references - start by flattening the offsets
  const flattenedLinkReferences = linkReferences
    // map each link ref to array of link refs with only one offset
    .map(({ offsets, length, name }) =>
      offsets.map(offset => ({ offset, length, name }))
    )
    // flatten
    .reduce((a, b) => [...a, ...b], []);

  // then overwite bytes with link reference
  bytes = flattenedLinkReferences.reduce((bytes, { offset, name, length }) => {
    // length is a byte offset
    const characterLength = length * 2;

    let linkId = `__${name.slice(0, characterLength - 2)}`;
    while (linkId.length < characterLength) {
      linkId += "_";
    }

    const start = offset * 2;

    return `${bytes.substring(0, start)}${linkId}${bytes.substring(
      start + characterLength
    )}`;
  }, bytes);

  return `0x${bytes}`;
}

module.exports = {
  shimOutput,
  shimContract,
  shimBytecode
};
