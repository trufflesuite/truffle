/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:network:networkGenealogies:findBetween");

import gql from "graphql-tag";

import type { Resource } from "@truffle/db/resources";
import { resources, Process } from "@truffle/db/process";

let fragmentIndex = 0;

/**
 * Find all ancestors of provided latest network back to provided earliest
 * network.
 */
export function* process(options: {
  earliest: Resource<"networks"> | undefined,
  latest: Resource<"networks"> | undefined
}): Process<Resource<"networks">[]> {
  if (!options.latest) {
    return [];
  }

  const {
    earliest: {
      historicBlock: {
        height: minimumHeight
      }
    } = { historicBlock: { height: 0 } },
    latest: {
      id
    }
  } = options;
  const {
    ancestors: networks
  } = yield* resources.get("networks", id, gql`
    fragment AncestorsAbove_${fragmentIndex++} on Network {
      ancestors(
        minimumHeight: ${minimumHeight}
        includeSelf: true
      ) {
        id
        historicBlock {
          height
          hash
        }
      }
    }
  `);

  debug("networks %O", networks);

  return networks.reverse();
}
