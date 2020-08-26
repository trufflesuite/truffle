import { Bytecode, LinkReference, CompiledContract } from "./index";

export namespace newToLegacy {
  export const contract = (contract: CompiledContract): any => {
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
      userdoc,
      immutableReferences
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
      userdoc,
      immutableReferences
    };
  };

  export const shimBytecode = (
    bytecode: Bytecode | string | undefined
  ): string | undefined => {
    if (bytecode === undefined) {
      return undefined;
    }
    if (typeof bytecode === "string") {
      return bytecode;
    }

    let { bytes, linkReferences } = bytecode;

    linkReferences = linkReferences || [];

    // inline link references - start by flattening the offsets
    const flattenedLinkReferences = linkReferences
      // map each link ref to array of link refs with only one offset
      .map(({ offsets, length, name }: LinkReference) =>
        offsets.map(offset => ({ offset, length, name }))
      )
      // flatten
      .reduce((a: object[], b: object[]) => [...a, ...b], []);

    // then overwite bytes with link reference
    bytes = flattenedLinkReferences.reduce(
      (
        bytes: string,
        {
          offset,
          name,
          length
        }: { offset: number; name: string; length: number }
      ) => {
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
      },
      bytes
    );

    return `0x${bytes}`;
  };
}

export namespace legacyToNew {
  export function shimContracts(contracts: any[]): CompiledContract[] {
    // convert to list
    return Object.values(contracts).map(shimContract);
  }

  export const shimContract = (contract: any): CompiledContract => {
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
      immutableReferences
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
      userdoc,
      immutableReferences
    };
  };

  export function shimBytecode(bytecode: string): Bytecode {
    if (!bytecode) {
      return undefined;
    }
    if (typeof bytecode === "object") {
      return bytecode;
    }

    const linkReferences: LinkReference[] = [];

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
}
