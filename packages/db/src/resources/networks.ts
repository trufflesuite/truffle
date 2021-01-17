import { logger } from "@truffle/db/logger";
const debug = logger("db:resources:networks");

import gql from "graphql-tag";

import { DataModel, IdObject, Definition } from "./types";

export const networks: Definition<"networks"> = {
  names: {
    resource: "network",
    Resource: "Network",
    resources: "networks",
    Resources: "Networks",
    resourcesMutate: "networksAdd",
    ResourcesMutate: "NetworksAdd"
  },
  createIndexes: [{ fields: ["historicBlock.height"] }],
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
      ): CandidateSearchResult!

      possibleDescendants(
        alreadyTried: [ID]!
        limit: Int # will default to 5
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
        resolve: resolveRelationship("ancestor")
      },

      descendants: {
        resolve: resolveRelationship("descendant")
      },

      possibleAncestors: {
        resolve: async ({ id }, { limit = 5, alreadyTried }, { workspace }) => {
          const network = await workspace.get("networks", id);
          const networks = await workspace.find("networks", {
            selector: {
              "historicBlock.height": {
                $lt: network.historicBlock.height,
                $ne: network.historicBlock.height
              },
              "networkId": network.networkId,
              "id": {
                $nin: alreadyTried
              }
            },
            sort: [{ "historicBlock.height": "desc" }],
            limit
          });

          return {
            networks,
            alreadyTried: [
              ...new Set([...alreadyTried, ...networks.map(({ id }) => id)])
            ]
          };
        }
      },
      possibleDescendants: {
        resolve: async ({ id }, { limit = 5, alreadyTried }, { workspace }) => {
          const network = await workspace.get("networks", id);
          const networks = await workspace.find("networks", {
            selector: {
              "historicBlock.height": {
                $gt: network.historicBlock.height,
                $ne: network.historicBlock.height
              },
              "networkId": network.networkId,
              "id": {
                $nin: alreadyTried
              }
            },
            sort: [{ "historicBlock.height": "asc" }],
            limit
          });

          return {
            networks,
            alreadyTried: [
              ...new Set([...alreadyTried, ...networks.map(({ id }) => id)])
            ]
          };
        }
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

function resolveRelationship(relationship: "ancestor" | "descendant") {
  const reverseRelationship =
    relationship === "ancestor" ? "descendant" : "ancestor";

  const heightOrder = relationship === "ancestor" ? "desc" : "asc";

  const superlativeOption =
    relationship === "ancestor" ? "onlyEarliest" : "onlyLatest";

  return async (network: IdObject<"networks">, options, { workspace }) => {
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

      const networkGenealogies: DataModel.NetworkGenealogyInput[] = await workspace.find(
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

    return await workspace.find("networks", {
      selector: {
        "historicBlock.height": { $gte: 0 },
        "id": { $in: ids }
      },
      sort: [{ "historicBlock.height": heightOrder }]
    });
  };
}
