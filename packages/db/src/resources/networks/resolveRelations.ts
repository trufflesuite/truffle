import { logger } from "@truffle/db/logger";
const debug = logger("db:resources:networks:resolveRelations");

import type { Input, IdObject, Workspace } from "../types";

export const resolveAncestors = resolveRelations("ancestor");
export const resolveDescendants = resolveRelations("descendant");

export function resolveRelations(relationship: "ancestor" | "descendant") {
  const {
    reverseRelationship,
    heightOrder,
    superlativeOption,
    heightBoundOption,
    heightBoundComparison
  } = relationshipProperties(relationship);

  return async (
    network: IdObject<"networks">,
    options,
    { workspace }: { workspace: Workspace }
  ) => {
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

    return await workspace.find("networks", {
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
  };
}

function relationshipProperties(relationship: "ancestor" | "descendant") {
  return relationship === "ancestor"
    ? ({
        reverseRelationship: "descendant",
        superlativeOption: "onlyEarliest",
        heightOrder: "desc",
        heightBoundOption: "minimumHeight",
        heightBoundComparison: "$gte"
      } as const)
    : ({
        reverseRelationship: "ancestor",
        superlativeOption: "onlyLatest",
        heightOrder: "asc",
        heightBoundOption: "maximumHeight",
        heightBoundComparison: "$gte"
      } as const);
}
