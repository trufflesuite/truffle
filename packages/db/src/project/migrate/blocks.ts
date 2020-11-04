import { logger } from "@truffle/db/logger";
const debug = logger("db:project:migrate:networks");

import { Process, PrepareBatch, _ } from "@truffle/db/project/process";

interface NetworkObject {
  transactionHash?: string;
}

export function* generateTransactionBlocks(options: {
  network: Omit<DataModel.NetworkInput, "historicBlock">;
  artifacts: {
    db: any;
    networks?: {
      [networkId: string]: NetworkObject;
    };
  }[];
}): Process<{
  network: Omit<DataModel.NetworkInput, "historicBlock">;
  artifacts: {
    db: any;
    networks?: {
      [networkId: string]: NetworkObject & {
        block?: DataModel.Block;
      };
    };
  }[];
}> {
  const { batch, unbatch } = prepareTransactionBlocksBatch(options);

  const blocks = [];
  for (const transactionHash of batch) {
    const {
      result: { blockHash: hash, blockNumber }
    } = yield {
      type: "web3",
      method: "eth_getTransactionByHash",
      params: [transactionHash]
    };

    const height = parseInt(blockNumber);

    blocks.push({ height, hash });
  }

  return unbatch(blocks);
}

const prepareTransactionBlocksBatch: PrepareBatch<
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
    block?: DataModel.Block;
  },
  string, // transactionHash
  DataModel.Block
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

    const { transactionHash } = networkObject;

    // since this field is not required
    if (!transactionHash) {
      continue;
    }

    breadcrumbs[batch.length] = {
      artifactIndex
    };

    batch.push(transactionHash);
  }

  const unbatch = (results: DataModel.Block[]) => {
    const artifacts: {
      db: any;
      networks?: {
        [networkId: string]: NetworkObject & {
          block?: DataModel.Block;
        };
      };
    }[] = [...structured.artifacts];

    for (const [index, result] of results.entries()) {
      const { artifactIndex } = breadcrumbs[index];

      artifacts[artifactIndex].networks[networkId] = {
        ...artifacts[artifactIndex].networks[networkId],
        block: result
      };
    }

    return { network, artifacts };
  };

  return { batch, unbatch };
};
