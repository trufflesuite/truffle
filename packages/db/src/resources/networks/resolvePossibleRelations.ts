import { logger } from "@truffle/db/logger";
const debug = logger("db:resources:networks:resolvePossibleRelations");

import type { Resource, SavedInput, IdObject, Workspace } from "../types";

export const resolvePossibleAncestors = resolvePossibleRelations("ancestor");
export const resolvePossibleDescendants = resolvePossibleRelations(
  "descendant"
);

export function resolvePossibleRelations(
  relationship: "ancestor" | "descendant"
) {
  const { queryName, heightFilter, heightOrder } = relationshipProperties(
    relationship
  );

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
        .filter(network => network)
        .filter(({ historicBlock: { height } }: SavedInput<"networks">) =>
          relationship === "ancestor"
            ? height < network.historicBlock.height
            : height > network.historicBlock.height
        )
        .filter(({ id }: SavedInput<"networks">) => !excluded.has(id))
        .sort((a: SavedInput<"networks">, b: SavedInput<"networks">) =>
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
    const network = await workspace.get("networks", id);

    const networks = await findPossibleNetworks({
      network,
      limit,
      alreadyTried,
      workspace,
      disableIndex
    });

    return {
      networks,
      alreadyTried: [
        ...new Set([
          ...alreadyTried,
          ...networks.map(({ id }: SavedInput<"networks">) => id)
        ])
      ]
    };
  };
}

function relationshipProperties(relationship: "ancestor" | "descendant") {
  return relationship === "ancestor"
    ? ({
        queryName: "possibleAncestors",
        heightFilter: "$lt",
        heightOrder: "desc"
      } as const)
    : ({
        queryName: "possibleDescendants",
        heightFilter: "$gt",
        heightOrder: "asc"
      } as const);
}
