import { logger } from "@truffle/db/logger";
const debug = logger("db:definitions:networks");

import gql from "graphql-tag";

import { Definition } from "./types";

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
      possibleAncestors(
        alreadyTried: [ID]!
        limit: Int # will default to 5
      ): [CandidateSearchResult]!
      possibleDescendants(
        alreadyTried: [ID]!
        limit: Int # will default to 5
      ): [CandidateSearchResult]!
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
      network: Network!
      alreadyTried: [ID]! #will include all networks returned
    }
  `,
  resolvers: {
    Network: {
      possibleAncestors: {
        resolve: async ({ id }, { limit = 5, alreadyTried }, { workspace }) => {
          const network = await workspace.get("networks", id);
          const result = await workspace.find("networks", {
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

          const untriedNetworks = result.map(network => {
            return {
              network,
              alreadyTried: alreadyTried
            };
          });

          return untriedNetworks;
        }
      },
      possibleDescendants: {
        resolve: async ({ id }, { limit = 5, alreadyTried }, { workspace }) => {
          const network = await workspace.get("networks", id);
          const result = await workspace.find("networks", {
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

          const untriedNetworks = result.map(network => {
            return {
              network,
              alreadyTried: alreadyTried
            };
          });

          return untriedNetworks;
        }
      }
    },
    CandidateSearchResult: {
      network: {
        resolve: async (parent, __, {}) => {
          return parent.network;
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
