/**
 * @category Internal processor
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:network:networkGenealogies:queryNext");

import gql from "graphql-tag";

import type { DataModel, IdObject } from "@truffle/db/resources";
import { resources, Process } from "@truffle/db/process";

let fragmentIndex = 0;

/**
 * Issue GraphQL queries for possibly-related networks.
 *
 * This is called repeatedly, passing the resulting `alreadyTried` to the next
 * invocation.
 */
export function* process(options: {
  relationship: "ancestor" | "descendant";
  network: IdObject<"networks">;
  alreadyTried: string[];
  disableIndex?: boolean;
}): Process<DataModel.CandidateSearchResult> {
  const { relationship, network, alreadyTried, disableIndex } = options;

  // determine GraphQL query to invoke based on requested relationship
  const query =
    relationship === "ancestor" ? "possibleAncestors" : "possibleDescendants";
  debug("finding %s", query);

  // query graphql for new candidates
  let result;
  try {
    ({ [query]: result } = yield* resources.get(
      "networks",
      network.id,
      gql`
        fragment Possible_${relationship}s_${fragmentIndex++} on Network {
          ${query}(
            alreadyTried: ${JSON.stringify(alreadyTried)}
            ${disableIndex ? "disableIndex: true" : ""}
          ) {
            networks {
              id
              historicBlock {
                hash
                height
              }
            }
            alreadyTried {
              id
            }
          }
        }
      `
    ));
  } catch (error) {
    debug("error %o", error);
  }

  debug("candidate networks %o", result.networks);
  return result;
}
