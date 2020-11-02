import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:contractInstances");

import { NetworkObject } from "@truffle/contract-schema/spec";
import { IdObject } from "@truffle/db/meta";
import { Process } from "@truffle/db/resources";

import { AddContractInstances } from "./add.graphql";

export interface LoadableContractInstanceBytecode {
  bytecode: IdObject<DataModel.Bytecode>;
  linkReferences?: DataModel.LinkReference[];
}

export interface LoadableContractInstance {
  contract: IdObject<DataModel.Contract>;
  network: IdObject<DataModel.Network>;
  networkObject: NetworkObject;
  bytecodes: {
    call: LoadableContractInstanceBytecode;
    create: LoadableContractInstanceBytecode;
  };
}

export function* generateContractInstancesLoad(
  loadableContractInstances: LoadableContractInstance[]
): Process<DataModel.ContractInstance[]> {
  const contractInstances = loadableContractInstances.map(
    ({
      contract,
      network,
      networkObject: { address, transactionHash },
      bytecodes: { call: callBytecode, create: createBytecode }
    }) => ({
      address,
      network,
      creation: {
        transactionHash,
        constructor: {
          createBytecode: link(createBytecode)
        }
      },
      contract,
      callBytecode: link(callBytecode)
    })
  );

  const result = yield {
    type: "graphql",
    request: AddContractInstances,
    variables: { contractInstances }
  };

  return result.data.contractInstancesAdd.contractInstances;
}

function link(
  loadableBytecode: LoadableContractInstanceBytecode,
  links?: NetworkObject["links"]
): DataModel.LinkedBytecodeInput {
  const { bytecode, linkReferences } = loadableBytecode;
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
