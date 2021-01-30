/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:network:fetchBlockForHeight");

import type { DataModel } from "@truffle/db/resources";
import type { Process } from "@truffle/db/process";

/**
 * Issue web3 requests to retrieve block hashes for a given list of heights.
 */
export function* process<Height extends number | "latest">(options: {
  height: Height;
}): Process<DataModel.Block | undefined, { web3: "eth_getBlockByNumber" }> {
  const height =
    typeof options.height === "number"
      ? `0x${options.height.toString(16)}`
      : options.height;

  const response = yield {
    type: "web3",
    method: "eth_getBlockByNumber",
    params: [height, false]
  };

  if (response && response.result && response.result.hash) {
    const { hash } = response.result;
    const height = parseInt(response.result.height);
    return { height, hash };
  }
}
