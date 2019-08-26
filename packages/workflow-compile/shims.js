const { multiPromisify } = require("./utils");

function shimLegacy(method) {
  return async config => {
    const compile = multiPromisify(method);

    const [contracts, sourceIndexes, compilerInfo] = await compile(config);

    return {
      contracts: shimContracts(contracts),
      sourceIndexes,
      compilerInfo
    };
  };
}

function shimContracts(contracts) {
  // convert to list
  return Object.values(contracts).map(shimContract);
}

function shimContract(contract) {
  const {
    contractName,
    contract_name,
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
    contractName: contract_name || contractName,
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
    compiler,
    devdoc,
    userdoc
  };
}

function shimBytecode(bytecode) {
  if (!bytecode) {
    return undefined;
  }

  const linkReferences = [];

  const bytes = bytecode
    .slice(2) // remove 0x prefix
    .replace(/__[^_]+_*/g, (linkReference, characterOffset) => {
      const [, name] = linkReference.match(/__([^_]+)_*/);

      const characterLength = linkReference.length;

      const offset = characterOffset / 2;
      const length = characterLength / 2;

      linkReferences.push({
        offsets: [offset],
        name,
        length
      });

      return "0".repeat(characterLength);
    });

  return { bytes, linkReferences };
}

module.exports = {
  shimLegacy,
  shimContracts,
  shimContract,
  shimBytecode
};
