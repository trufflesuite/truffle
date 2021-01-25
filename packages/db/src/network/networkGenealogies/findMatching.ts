/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:network:networkGenealogies:findMatching");

import type { Resource } from "@truffle/db/resources";
import type { Process } from "@truffle/db/process";

/**
 * Issue web3 requests for a list of candidate Networks to determine
 * if any of their historic blocks are present in the connected blockchain.
 *
 * This works by querying for block hashes for given candidate heights
 */
export function* process(
  candidates: Resource<"networks">[]
): Process<Resource<"networks"> | undefined> {
  for (const candidate of candidates) {
    const response = yield {
      type: "web3",
      method: "eth_getBlockByNumber",
      params: [`0x${candidate.historicBlock.height.toString(16)}`, false]
    };

    // return if we have a result
    if (
      response &&
      response.result &&
      response.result.hash === candidate.historicBlock.hash
    ) {
      debug("found matching height %O", candidate.historicBlock.height);
      return candidate;
    }
  }
}
