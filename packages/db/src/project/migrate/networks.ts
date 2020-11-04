import { logger } from "@truffle/db/logger";
const debug = logger("db:project:migrate:networks");

import { IdObject } from "@truffle/db/meta";
import { Process, resources } from "@truffle/db/project/process";
import { PrepareBatch, _ } from "@truffle/db/loaders/batch";

interface NetworkObject {
  block?: DataModel.Block;
}

export function* generateNetworksLoad(options: {
  network: Omit<DataModel.NetworkInput, "historicBlock">;
  artifacts: {
    db: any;
    networks?: {
      [networkId: string]: NetworkObject;
    };
  }[];
}): Process<{
  network: DataModel.Network | undefined;
  artifacts: {
    db: any;
    networks?: {
      [networkId: string]: NetworkObject & {
        db?: {
          network: IdObject<DataModel.Network>;
        };
      };
    };
  }[];
}> {
  const {
    network: { networkId }
  } = options;

  const { batch, unbatch } = prepareNetworksBatch(options);

  const networks = yield* resources.load("networks", batch);

  const { artifacts } = unbatch(networks);

  const [
    {
      db: { network }
    }
  ] = artifacts
    .map(({ networks }) => networks[networkId])
    .filter(networkObject => networkObject && networkObject.block)
    .sort((a, b) => b.block.height - a.block.height); // descending

  return {
    network: {
      ...options.network,
      ...network,
      networkId
    },
    artifacts
  };
}

const prepareNetworksBatch: PrepareBatch<
  {
    network: Omit<DataModel.NetworkInput, "historicBlock">;
    artifacts: {
      db: any;
      networks?: {
        [networkId: string]: _;
      };
    }[];
  },
  NetworkObject,
  NetworkObject & {
    db?: {
      network: IdObject<DataModel.Network>;
    };
  },
  DataModel.NetworkInput,
  IdObject<DataModel.Network>
> = structured => {
  const batch = [];
  const breadcrumbs: {
    [index: number]: {
      artifactIndex: number;
    };
  } = {};

  const { network } = structured;
  const { networkId } = network;

  for (const [artifactIndex, artifact] of structured.artifacts.entries()) {
    if (!artifact.networks) {
      continue;
    }

    const networkObject = artifact.networks[networkId];

    // skip over artifacts that don't contain this network
    if (!networkObject) {
      continue;
    }

    const { block } = networkObject;

    if (!block) {
      continue;
    }

    breadcrumbs[batch.length] = {
      artifactIndex
    };

    batch.push({
      ...network,
      historicBlock: block
    });
  }

  const unbatch = (results: IdObject<DataModel.Network>[]) => {
    const artifacts: {
      db: any;
      networks?: {
        [networkId: string]: NetworkObject & {
          db?: {
            network: IdObject<DataModel.Network>;
          };
        };
      };
    }[] = [...structured.artifacts];

    for (const [index, result] of results.entries()) {
      const { artifactIndex } = breadcrumbs[index];

      artifacts[artifactIndex].networks[networkId] = {
        ...artifacts[artifactIndex].networks[networkId],
        db: {
          network: result
        }
      };
    }

    return { network, artifacts };
  };

  return { batch, unbatch };
};
