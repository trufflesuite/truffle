import { logger } from "@truffle/db/logger";
const debug = logger("db:resources:networks:resolvePossibleRelations");

import type { Resource, IdObject, Workspace } from "../types";

export function resolvePossibleRelations(
  relationship: "ancestor" | "descendant"
) {
  const queryName =
    relationship === "ancestor" ? "possibleAncestors" : "possibleDescendants";

  const heightFilter: "$lt" | "$gt" =
    relationship === "ancestor" ? "$lt" : "$gt";

  const heightOrder: "desc" | "asc" =
    relationship === "ancestor" ? "desc" : "asc";

  const findPossibleNetworks = async (options: {
    network: Resource<"networks">;
    limit: number;
    alreadyTried: string[];
    workspace: Workspace;
    disableIndex: boolean;
  }) => {
    const { network, limit, alreadyTried, workspace, disableIndex } = options;

    // HACK to work around a problem with WebSQL "too many parameters" errors
    //
    // this query tends to fail when there are ~5000 or more networks, likely
    // due to PouchDB's magic use of indexes.
    //
    // so, anticipating this, let's prepare to try the index-based find first,
    // but fallback to a JS in-memory approach because that's better than
    // failing.

    // attempt 1
    if (!disableIndex) {
      try {
        const query = {
          selector: {
            "historicBlock.height": {
              [heightFilter]: network.historicBlock.height,
              $ne: network.historicBlock.height
            },
            "networkId": network.networkId,
            "id": {
              $nin: alreadyTried
            }
          },
          sort: [{ "historicBlock.height": heightOrder }],
          limit
        };

        return await workspace.find("networks", query);
      } catch (error) {
        debug(
          "Network.%s failed using PouchDB indexes. Error: %o",
          queryName,
          error
        );
        debug("Retrying with in-memory comparisons");
      }
    }

    // attempt 2
    {
      const query = {
        selector: {
          networkId: network.networkId
        }
      };

      const excluded = new Set(alreadyTried);

      return (await workspace.find("networks", query))
        .filter(({ historicBlock: { height } }) =>
          relationship === "ancestor"
            ? height < network.historicBlock.height
            : height > network.historicBlock.height
        )
        .filter(({ id }) => !excluded.has(id))
        .sort((a, b) =>
          relationship === "ancestor"
            ? b.historicBlock.height - a.historicBlock.height
            : a.historicBlock.height - b.historicBlock.height
        )
        .slice(0, limit);
    }
  };

  return async (
    { id }: IdObject<"networks">,
    { limit = 5, alreadyTried, disableIndex },
    { workspace }
  ) => {
    debug("Resolving Network.%s...", queryName);

    const network = await workspace.get("networks", id);

    const networks = await findPossibleNetworks({
      network,
      limit,
      alreadyTried,
      workspace,
      disableIndex
    });

    const result = {
      networks,
      alreadyTried: [
        ...new Set([...alreadyTried, ...networks.map(({ id }) => id)])
      ]
    };
    debug("Resolved Network.%s.", queryName);
    return result;
  };
}
