import { logger } from "@truffle/db/logger";
const debug = logger("db:resources:networks");

import gql from "graphql-tag";

import { Resource, Input, IdObject, Definition, Workspace } from "./types";

export const networks: Definition<"networks"> = {
  names: {
    resource: "network",
    Resource: "Network",
    resources: "networks",
    Resources: "Networks",
    resourcesMutate: "networksAdd",
    ResourcesMutate: "NetworksAdd"
  },
  createIndexes: [
    { fields: ["networkId"] },
    { fields: ["historicBlock.height"] },
    { fields: ["networkId", "historicBlock.height"] }
  ],
  idFields: ["networkId", "historicBlock"],
  typeDefs: gql`
    type Network implements Resource & Named {
      name: String!
      networkId: NetworkId!
      historicBlock: Block!
      fork: Network

      ancestors(
        limit: Int # default all
        includeSelf: Boolean # default false
        onlyEarliest: Boolean # default false
      ): [Network]!

      descendants(
        limit: Int # default all
        includeSelf: Boolean # default false
        onlyLatest: Boolean # default false
      ): [Network]!

      possibleAncestors(
        alreadyTried: [ID]!
        limit: Int # will default to 5
        disableIndex: Boolean # for internal use
      ): CandidateSearchResult!

      possibleDescendants(
        alreadyTried: [ID]!
        limit: Int # will default to 5
        disableIndex: Boolean # for internal use
      ): CandidateSearchResult!
    }

    scalar NetworkId

    type Block {
      height: Int!
      hash: String!
    }

    input NetworkInput {
      name: String!
      networkId: NetworkId!
      historicBlock: BlockInput!
    }

    input BlockInput {
      height: Int!
      hash: String!
    }

    type CandidateSearchResult {
      networks: [Network]!
      alreadyTried: [ID]! #will include all networks returned
    }
  `,
  resolvers: {
    Network: {
      ancestors: {
        resolve: resolveRelations("ancestor")
      },

      descendants: {
        resolve: resolveRelations("descendant")
      },

      possibleAncestors: {
        resolve: resolvePossibleRelations("ancestor")
      },

      possibleDescendants: {
        resolve: resolvePossibleRelations("descendant")
      }
    },
    CandidateSearchResult: {
      networks: {
        resolve: async (parent, __, {}) => {
          return parent.networks;
        }
      },
      alreadyTried: {
        resolve: (parent, __, {}) => {
          return parent.alreadyTried;
        }
      }
    }
  }
};

function resolveRelations(
  relationship: "ancestor" | "descendant"
) {
  const reverseRelationship = relationship === "ancestor"
    ? "descendant"
    : "ancestor";

  const heightOrder = relationship === "ancestor" ? "desc" : "asc";

  const superlativeOption =
    relationship === "ancestor" ? "onlyEarliest" : "onlyLatest";

  return async (
    network: IdObject<"networks">,
    options,
    { workspace }
  ) => {
    debug("Resolving Network.%s...", `${relationship}s`);

    const { id } = network;
    const {
      limit,
      includeSelf = false,
      [superlativeOption]: onlySuperlative
    } = options;

    let depth = 1;
    const relations: Set<string> = includeSelf ? new Set([id]) : new Set([]);
    const superlatives: Set<string> = new Set([]);
    let unsearched: string[] = [id];

    while (unsearched.length && (typeof limit !== "number" || depth <= limit)) {
      debug("depth %d", depth);
      debug("unsearched %o", unsearched);

      const networkGenealogies: Input<"networkGenealogies">[] = await workspace.find(
        "networkGenealogies",
        {
          selector: {
            [`${reverseRelationship}.id`]: { $in: unsearched }
          }
        }
      );
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
        "historicBlock.height": { $gte: 0 },
        "id": { $in: ids }
      },
      sort: [{ "historicBlock.height": heightOrder }]
    });

    debug("Resolved Network.%s.", `${relationship}s`);

    return results;
  };
}

function resolvePossibleRelations(
  relationship: "ancestor" | "descendant"
) {
  const queryName = relationship === "ancestor"
    ? "possibleAncestors"
    : "possibleDescendants";

  const heightFilter: "$lt" | "$gt" = relationship === "ancestor"
    ? "$lt"
    : "$gt";

  const heightOrder: "desc" | "asc" = relationship === "ancestor"
    ? "desc"
    : "asc";

  const findPossibleNetworks = async (options: {
    network: Resource<"networks">,
    limit: number,
    alreadyTried: string[],
    workspace: Workspace,
    disableIndex: boolean
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
          "networkId": network.networkId,
        }
      };

      const excluded = new Set(alreadyTried);

      return (await workspace.find("networks", query))
        .filter(
          ({ historicBlock: { height } }) => relationship === "ancestor"
            ? height < network.historicBlock.height
            : height > network.historicBlock.height
        )
        .filter(({ id }) => !excluded.has(id))
        .sort(
          (a, b) => relationship === "ancestor"
            ? b.historicBlock.height - a.historicBlock.height
            : a.historicBlock.height - b.historicBlock.height
        )
        .slice(0, limit);
    }
  }

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
  }
}
