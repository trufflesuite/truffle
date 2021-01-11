import { logger } from "@truffle/db/logger";
const debug = logger("db:project:migrate:networks");

import { DataModel } from "@truffle/db/project/process";
import * as Batch from "./batch";

export const generateTransactionBlocks = Batch.generate<{
  requires: {
    transactionHash?: string;
  };
  produces: {
    block?: DataModel.Block;
  };
  entry: string; // transactionHash
  result: DataModel.Block;
}>({
  extract({ input: { transactionHash } }) {
    return transactionHash;
  },

  *process({ entries }) {
    const blocks = [];
    for (const transactionHash of entries) {
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

    return blocks;
  },

  convert<_I, _O>({ result, input }) {
    return {
      ...input,
      block: result
    };
  }
});
