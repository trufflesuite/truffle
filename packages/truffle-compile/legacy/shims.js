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

function shimBytecode(bytecode) {
  return bytecode;
}

module.exports = {
  shimOutput,
  shimContract,
  shimBytecode
};
