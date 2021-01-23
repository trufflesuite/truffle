/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:network:transactionBlocks");

import { Process } from "@truffle/db/process";
import { DataModel } from "@truffle/db/resources";

export function* process(transactionHashes: string[]): Process<
  DataModel.Block[],
  { web3: "eth_getTransactionByHash" }
> {
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

    const {
      blockHash: hash,
      blockNumber
    } = response.result;

    const height = parseInt(blockNumber);

    blocks.push({ height, hash });
  }

  return blocks;
}
