/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:network:initialize:genesisBlock");

import type { Process } from "@truffle/db/process";
import type { DataModel } from "@truffle/db/resources";

export function* process(): Process<
  DataModel.Block,
  { web3: "eth_getBlockByNumber" }
> {
  debug("Generating genesis block fetch...");

  const response = yield {
    type: "web3",
    method: "eth_getBlockByNumber",
    params: ["0x0", false]
  };

  // not sure why this would fail but just in case
  if (!response || !response.result) {
    debug("response %O", response);
    throw new Error("Invalid response for fetching genesis block");
  }

  const { hash } = response.result;

  debug("Generated genesis block fetch.");
  return { height: 0, hash };
}
