import type { Bytecode, CompiledContract, LinkReference } from "../types";

export function forContracts(contracts: any[]): CompiledContract[] {
  // convert to list
  return Object.values(contracts).map(forContract);
}

export function forContract(contract: any): CompiledContract {
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
    userdoc,
    immutableReferences,
    generatedSources,
    deployedGeneratedSources,
    db
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
    bytecode: bytecode ? forBytecode(bytecode) : undefined,
    deployedBytecode: deployedBytecode
      ? forBytecode(deployedBytecode)
      : undefined,
    compiler,
    devdoc,
    userdoc,
    immutableReferences,
    generatedSources,
    deployedGeneratedSources,
    db
  };
}

export function forBytecode(bytecode: string): Bytecode {
  if (typeof bytecode === "object") {
    return bytecode;
  }

  const linkReferences: LinkReference[] = [];

  const bytes = bytecode
    .slice(2) // remove 0x prefix
    .replace(/__[^_]+_*/g, (linkReference, characterOffset) => {
      const match = linkReference.match(/__([^_]+)_*/);
      if (match === null) {
        //this can't actually happen, but strictNullChecks requires it
        throw new Error("Could not extract link reference name");
      }
      const name = match[1];

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
