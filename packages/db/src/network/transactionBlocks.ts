/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:network:transactionBlocks");

import type { Process } from "@truffle/db/process";
import type { DataModel } from "@truffle/db/resources";

export function* process(options: {
  transactionHashes: string[];
}): Process<DataModel.Block[], { web3: "eth_getTransactionByHash" }> {
  const { transactionHashes } = options;

  const blocks: DataModel.Block[] = [];

  for (const transactionHash of transactionHashes) {
    const response = yield {
      type: "web3",
      method: "eth_getTransactionByHash",
      params: [transactionHash]
    };

    if (!response || !response.result || !response.result.blockNumber) {
      blocks.push(null);
      continue;
    }

    const { blockHash: hash, blockNumber } = response.result;

    const height = parseInt(blockNumber);

    blocks.push({ height, hash });
  }

  return blocks;
}
