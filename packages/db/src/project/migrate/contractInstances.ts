import { logger } from "@truffle/db/logger";
const debug = logger("db:project:migrate:contractInstances");

import { DataModel, IdObject, resources } from "@truffle/db/project/process";
import * as Batch from "./batch";

export const generateContractInstancesLoad = Batch.generate<{
  artifact: {
    db: {
      contract: IdObject<DataModel.Contract>;
      callBytecode: IdObject<DataModel.Bytecode>;
      createBytecode: IdObject<DataModel.Bytecode>;
    };
  };
  requires: {
    callBytecode?: {
      linkReferences: { name: string }[];
    };
    createBytecode?: {
      linkReferences: { name: string }[];
    };
    db?: {
      network: IdObject<DataModel.Network>;
    };
  };
  produces: {
    db?: {
      contractInstance: IdObject<DataModel.ContractInstance>;
    };
  };
  entry: DataModel.ContractInstanceInput;
  result: IdObject<DataModel.ContractInstance>;
}>({
  extract({ input, inputs, breadcrumb }) {
    const { artifacts } = inputs;
    const { artifactIndex } = breadcrumb;

    const artifact = artifacts[artifactIndex];

    const {
      address,
      transactionHash,
      links,
      callBytecode: { linkReferences: callLinkReferences },
      createBytecode: { linkReferences: createLinkReferences },
      db: { network }
    } = input;

    const {
      db: { contract, callBytecode, createBytecode }
    } = artifact;

    return {
      address,
      network,
      contract,
      callBytecode: link(callBytecode, callLinkReferences, links),
      creation: {
        transactionHash,
        constructor: {
          createBytecode: link(createBytecode, createLinkReferences, links)
        }
      }
    };
  },

  *process({ entries }) {
    return yield* resources.load("contractInstances", entries);
  },

  convert<_I, _O>({ result, input }) {
    return {
      ...input,
      db: {
        ...(input.db || {}),
        contractInstance: result
      }
    };
  }
});

function link(
  bytecode: IdObject<DataModel.Bytecode>,
  linkReferences: { name: string }[],
  links?: { [name: string]: string }
): DataModel.LinkedBytecodeInput {
  if (!links) {
    return {
      bytecode,
      linkValues: []
    };
  }

  const linkValues = Object.entries(links).map(([name, value]) => ({
    value,
    linkReference: {
      bytecode,
      index: linkReferences.findIndex(
        linkReference => name === linkReference.name
      )
    }
  }));

  return {
    bytecode,
    linkValues
  };
}
