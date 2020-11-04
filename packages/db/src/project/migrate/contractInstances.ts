import { logger } from "@truffle/db/logger";
const debug = logger("db:project:migrate:networks");

import { toIdObject, IdObject } from "@truffle/db/meta";
import {
  resources,
  Process,
  PrepareBatch,
  _
} from "@truffle/db/project/process";

interface NetworkObject {
  address: string;
  transactionHash: string;
  links?: {
    [name: string]: string;
  };
  db?: {
    network: IdObject<DataModel.Network>;
  };
}

interface Artifact {
  db: {
    contract: DataModel.Contract;
  };
  networks?: {
    [networkId: string]: NetworkObject;
  };
}

export function* generateContractInstancesLoad(options: {
  network: DataModel.Network | undefined;
  artifacts: Artifact[];
}): Process<{
  network: DataModel.Network | undefined;
  artifacts: (Artifact & {
    networks?: {
      [networkId: string]: NetworkObject & {
        db?: {
          contractInstance: IdObject<DataModel.ContractInstance>;
        };
      };
    };
  })[];
}> {
  const { batch, unbatch } = prepareContractInstancesBatch(options);

  const contractInstances = yield* resources.load("contractInstances", batch);

  return unbatch(contractInstances);
}

const prepareContractInstancesBatch: PrepareBatch<
  {
    network: DataModel.Network | undefined;
    artifacts: {
      db: {
        contract: DataModel.Contract;
      };
      networks?: {
        [networkId: string]: _;
      };
    }[];
  },
  NetworkObject,
  NetworkObject & {
    db?: {
      contractInstance: IdObject<DataModel.ContractInstance>;
    };
  },
  DataModel.ContractInstanceInput,
  IdObject<DataModel.ContractInstance>
> = structured => {
  const batch = [];
  const breadcrumbs: {
    [index: number]: {
      artifactIndex: number;
    };
  } = {};

  const {
    network: { networkId }
  } = structured;

  for (const [artifactIndex, artifact] of structured.artifacts.entries()) {
    if (!artifact.networks) {
      continue;
    }

    const networkObject = artifact.networks[networkId];

    // skip over artifacts that don't contain this network
    if (!networkObject || !networkObject.db) {
      continue;
    }

    const {
      address,
      transactionHash,
      links,
      db: { network }
    } = networkObject;

    const {
      db: { contract }
    } = artifact;

    const { callBytecode, createBytecode } = contract;

    breadcrumbs[batch.length] = {
      artifactIndex
    };

    batch.push({
      address,
      network,
      contract: toIdObject(contract),
      callBytecode: link(callBytecode, links),
      creation: {
        transactionHash,
        constructor: {
          createBytecode: link(createBytecode, links)
        }
      }
    });
  }

  const unbatch = (results: IdObject<DataModel.ContractInstance>[]) => {
    // @ts-ignore
    const artifacts: (Artifact & {
      networks?: {
        [networkId: string]: NetworkObject & {
          db?: {
            contractInstance: IdObject<DataModel.ContractInstance>;
          };
        };
      };
    })[] = [...structured.artifacts];

    for (const [index, result] of results.entries()) {
      const { artifactIndex } = breadcrumbs[index];

      artifacts[artifactIndex].networks[networkId] = {
        ...artifacts[artifactIndex].networks[networkId],
        db: {
          ...artifacts[artifactIndex].networks[networkId].db,
          contractInstance: result
        }
      };
    }

    return {
      network: structured.network,
      artifacts
    };
  };

  return { batch, unbatch };
};

function link(
  bytecode: DataModel.Bytecode,
  links?: NetworkObject["links"]
): DataModel.LinkedBytecodeInput {
  const { linkReferences } = bytecode;
  if (!links) {
    return {
      bytecode,
      linkValues: []
    };
  }

  const linkValues = Object.entries(links).map(([name, value]) => ({
    value,
    linkReference: {
      bytecode: toIdObject(bytecode),
      index: linkReferences.findIndex(
        linkReference => name === linkReference.name
      )
    }
  }));

  return {
    bytecode: toIdObject(bytecode),
    linkValues
  };
}
