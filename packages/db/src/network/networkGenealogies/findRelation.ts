/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:network:networkGenealogies:findRelation");

import type { IdObject, Resource } from "@truffle/db/resources";
import type { Process } from "@truffle/db/process";
import * as FindMatchingCandidateOnChain from "./findMatching";
import * as QueryNextPossiblyRelatedNetworks from "./queryNext";

export { FindMatchingCandidateOnChain, QueryNextPossiblyRelatedNetworks };


/**
 * Issue GraphQL requests and eth_getBlockByNumber requests to determine if any
 * existing Network resources are ancestor or descendant of the connected
 * Network.
 *
 * Iteratively, this queries all possibly-related Networks for known historic
 * block. For each possibly-related Network, issue a corresponding web3 request
 * to determine if the known historic block is, in fact, the connected
 * blockchain's record of the block at that historic height.
 *
 * This queries @truffle/db for possibly-related Networks in batches, keeping
 * track of new candidates vs. what has already been tried.
 */
export function* process(
  relation: "ancestor" | "descendant",
  network: IdObject<"networks">,
  disableIndex?: boolean
): Process<Resource<"networks"> | undefined> {
  // determine GraphQL query to invoke based on requested relation
  const query =
    relation === "ancestor" ? "possibleAncestors" : "possibleDescendants";

  // since we're doing this iteratively, keep track of what networks we've
  // tried and which ones we haven't
  let alreadyTried: string[] = [];
  let candidates: Resource<"networks">[];

  do {
    // query graphql for new candidates
    ({
      networks: candidates,
      alreadyTried
    } = yield* QueryNextPossiblyRelatedNetworks.process(
      relation,
      network,
      alreadyTried,
      disableIndex
    ));

    // check blockchain to find a matching network
    const matchingCandidate:
      | Resource<"networks">
      | undefined = yield* FindMatchingCandidateOnChain.process(candidates);

    if (matchingCandidate) {
      return matchingCandidate;
    }
  } while (candidates.length > 0);

  // otherwise we got nothin'
}
