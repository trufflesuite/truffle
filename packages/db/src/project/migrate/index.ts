import { logger } from "@truffle/db/logger";
const debug = logger("db:project:migrate");

import { toIdObject, IdObject } from "@truffle/db/meta";
import { Process } from "@truffle/db/definitions";

import { generateNetworkId } from "./networkId";
import { generateTransactionBlocks } from "./blocks";
import { generateNetworksLoad } from "./networks";
import { generateContracts } from "./contracts";
import { generateContractInstancesLoad } from "./contractInstances";

export interface NetworkObject {
  address: string;
  transactionHash: string;
  links?: {
    [name: string]: string;
  };
}

export interface Artifact {
  db: {
    contract: IdObject<DataModel.Contract>;
  };

  networks?: {
    [networkId: string]: NetworkObject;
  };
}

export function* generateMigrateLoad(options: {
  // we'll need everything for this input other than what's calculated here
  network: Omit<DataModel.NetworkInput, "networkId" | "historicBlock">;
  artifacts: Artifact[];
}): Process<{
  network: IdObject<DataModel.Network>;
  artifacts: (Artifact & {
    networks: {
      [networkId: string]: {
        db?: {
          network: IdObject<DataModel.Network>;
          contractInstance: IdObject<DataModel.ContractInstance>;
        };
      };
    };
  })[];
}> {
  const networkId = yield* generateNetworkId();

  const withBlocks = yield* generateTransactionBlocks({
    network: {
      ...options.network,
      networkId
    },
    artifacts: options.artifacts
  });

  const withNetworks = yield* generateNetworksLoad(withBlocks);

  const withContracts = yield* generateContracts(withNetworks);

  const { network, artifacts } = yield* generateContractInstancesLoad(
    withContracts
  );

  return {
    network: toIdObject(network),
    artifacts: artifacts.map(artifact => ({
      ...artifact,
      db: {
        ...artifact.db,
        contract: toIdObject(artifact.db.contract)
      },
      networks: artifact.networks
    }))
  };
}
