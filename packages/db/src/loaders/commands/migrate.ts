import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:commands:migrate");

import gql from "graphql-tag";
import { generate } from "@truffle/db/generate";
import { ContractObject } from "@truffle/contract-schema/spec";
import { toIdObject, IdObject } from "@truffle/db/meta";
import { Process } from "@truffle/db/definitions";

import {
  generateTranasctionNetworkLoad,
  generateNetworkIdFetch
} from "@truffle/db/loaders/resources/networks";
import {
  LoadableContractInstance,
  generateContractInstancesLoad
} from "@truffle/db/loaders/resources/contractInstances";

export interface GenerateMigrateLoadOptions {
  // we'll need everything for this input other than what's calculated here
  network: Omit<DataModel.NetworkInput, "networkId" | "historicBlock">;
  artifacts: ContractObject[];
}

export function* generateMigrateLoad(
  options: GenerateMigrateLoadOptions
): Process<{
  network: IdObject<DataModel.Network>;
  contractInstances: IdObject<DataModel.ContractInstance>[];
}> {
  // for each artifact, first add a Network resource for the historic block
  // when the contract was deployed
  //
  // one of these networks will be the latest, so that's what we'll return
  // (for purposes of namekeeping, e.g.)

  // first, get the networkId from the blockchain
  const networkId = yield* generateNetworkIdFetch();

  // start enumerating over the artifacts
  let latestNetwork: DataModel.Network | undefined;
  const contractNetworks: ContractNetwork[] = [];
  for (const artifact of options.artifacts) {
    if (!artifact.networks[networkId]) {
      // skip over artifacts that don't contain this network
      continue;
    }

    const { transactionHash } = artifact.networks[networkId];

    // load the historical network
    const network = yield* generateTranasctionNetworkLoad({
      transactionHash,
      network: {
        name: options.network.name,
        networkId
      }
    });

    if (
      latestNetwork &&
      latestNetwork.historicBlock.height < network.historicBlock.height
    ) {
      latestNetwork = network;
    }

    // keep track of this new network alongside the artifact
    contractNetworks.push({
      network: toIdObject(network),
      artifact
    });
  }

  // now, let's get ready to add the contract instances
  const loadableContractInstances = yield* processContractNetworks(
    contractNetworks
  );

  // and do it
  const contractInstances = yield* generateContractInstancesLoad(
    loadableContractInstances
  );

  return {
    network: toIdObject(latestNetwork),
    contractInstances: contractInstances.map(toIdObject)
  };
}

interface ContractNetwork {
  network: IdObject<DataModel.Network>;
  artifact: ContractObject;
}

function* processContractNetworks(
  contractNetworks: ContractNetwork[]
): Process<LoadableContractInstance[]> {
  const loadableContractInstances = [];
  for (const { network, artifact } of contractNetworks) {
    // @ts-ignore
    const { contract }: IdObject<DataModel.Contract> = artifact.db;
    const { createBytecode, callBytecode } = yield* generate.get(
      "contracts",
      // @ts-ignore
      contract.id,
      gql`
        fragment ContractFragment on Contract {
          id
          name
          createBytecode {
            id
            bytes
            linkReferences {
              name
            }
          }
          callBytecode {
            id
            bytes
            linkReferences {
              name
            }
          }
        }
      `
    );

    const { networkId } = yield* generate.get(
      "networks",
      network.id,
      gql`
        fragment NetworkId on Network {
          networkId
        }
      `
    );

    const networkObject = artifact.networks[networkId];
    if (!networkObject) {
      continue;
    }

    loadableContractInstances.push({
      contract,
      network,
      networkObject,
      bytecodes: {
        call: {
          bytecode: toIdObject(callBytecode),
          linkReferences: callBytecode.linkReferences
        },
        create: {
          bytecode: toIdObject(createBytecode),
          linkReferences: createBytecode.linkReferences
        }
      }
    });
  }

  return loadableContractInstances;
}
