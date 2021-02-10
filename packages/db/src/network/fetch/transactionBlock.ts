/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:network:fetch:transactionBlock");

import type { Process } from "@truffle/db/process";
import type { DataModel } from "@truffle/db/resources";

export function* process(options: {
  transactionHash: string;
}): Process<DataModel.Block, { web3: "eth_getTransactionByHash" }> {
  const { transactionHash } = options;

  const response = yield {
    type: "web3",
    method: "eth_getTransactionByHash",
    params: [transactionHash]
  };

  if (!response || !response.result || !response.result.blockNumber) {
    return;
  }

  const { blockHash: hash, blockNumber } = response.result;

  const height = parseInt(blockNumber);

  return { height, hash };
}
