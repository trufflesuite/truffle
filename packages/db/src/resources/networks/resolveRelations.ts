import { logger } from "@truffle/db/logger";
const debug = logger("db:resources:networks:resolveRelations");

import type { Input, IdObject, Workspace } from "../types";

export function resolveRelations(relationship: "ancestor" | "descendant") {
  const reverseRelationship =
    relationship === "ancestor" ? "descendant" : "ancestor";

  const heightOrder = relationship === "ancestor" ? "desc" : "asc";

  const superlativeOption =
    relationship === "ancestor" ? "onlyEarliest" : "onlyLatest";

  const heightBoundOption =
    relationship === "ancestor" ? "minimumHeight" : "maximumHeight";
  const heightBoundComparison = relationship === "ancestor" ? "$gte" : "$lte";

  return async (
    network: IdObject<"networks">,
    options,
    { workspace }: { workspace: Workspace }
  ) => {
    debug("Resolving Network.%s...", `${relationship}s`);

    const { id } = network;
    const {
      limit,
      includeSelf = false,
      [superlativeOption]: onlySuperlative,
      [heightBoundOption]: heightBound
    } = options;

    let depth = 1;
    const relations: Set<string> = includeSelf ? new Set([id]) : new Set([]);
    const superlatives: Set<string> = new Set([]);
    let unsearched: string[] = [id];

    while (unsearched.length && (typeof limit !== "number" || depth <= limit)) {
      debug("depth %d", depth);
      debug("unsearched %o", unsearched);

      const networkGenealogies: Input<
        "networkGenealogies"
      >[] = await workspace.find("networkGenealogies", {
        selector: {
          [`${reverseRelationship}.id`]: { $in: unsearched }
        }
      });
      debug("networkGenealogies %o", networkGenealogies);

      const hasRelation = new Set(
        networkGenealogies.map(({ [reverseRelationship]: { id } }) => id)
      );

      const missingRelation = unsearched.filter(id => !hasRelation.has(id));

      for (const id of missingRelation) {
        superlatives.add(id);
      }

      unsearched = networkGenealogies
        .map(({ [relationship]: { id } }) => id)
        .filter(id => !relations.has(id));

      for (const id of unsearched) {
        relations.add(id);
      }

      depth++;
    }

    const ids = onlySuperlative ? [...superlatives] : [...relations];

    const results = await workspace.find("networks", {
      selector: {
        "historicBlock.height":
          typeof heightBound === "number"
            ? {
                [heightBoundComparison]: heightBound
              }
            : {
                $gte: 0
              },
        "id": { $in: ids }
      },
      sort: [{ "historicBlock.height": heightOrder }]
    });

    debug("Resolved Network.%s.", `${relationship}s`);

    return results;
  };
}
