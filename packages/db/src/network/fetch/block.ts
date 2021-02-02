/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:network:fetch:block");

import type { DataModel } from "@truffle/db/resources";
import type { Process } from "@truffle/db/process";

/**
 * Issue web3 requests to retrieve block hashes for a given list of heights.
 */
export function* process<Height extends number | "latest">(options: {
  block: {
    hash?: string;
    height: Height;
  };
  settings?: {
    skipComplete?: boolean;
  };
}): Process<DataModel.Block | undefined, { web3: "eth_getBlockByNumber" }> {
  const { block: input, settings: { skipComplete = false } = {} } = options;

  if (input.hash && typeof input.height === "number" && skipComplete) {
    return input as DataModel.Block;
  }

  const heightParam =
    typeof input.height === "number"
      ? `0x${input.height.toString(16)}`
      : input.height;

  const response = yield {
    type: "web3",
    method: "eth_getBlockByNumber",
    params: [heightParam, false]
  };

  debug("response %O", response);

  if (response && response.result && response.result.hash) {
    const { hash } = response.result;
    const height = parseInt(response.result.number);

    if (input.hash && input.hash !== hash) {
      throw new Error(
        [
          `Input block { height: ${height}, hash: "${input.hash}" } did `,
          `not match fetched hash ${hash}, aborting.`
        ].join("")
      );
    }

    return { height, hash };
  }
}
