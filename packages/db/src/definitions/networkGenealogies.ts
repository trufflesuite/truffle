import gql from "graphql-tag";

import {Definition} from "./types";

export const networkGenealogies: Definition<"networkGenealogies"> = {
  createIndexes: [],
  idFields: ["ancestor", "descendant"],
  typeDefs: gql`
    type CandidateSearchResult {
      network: Network!
      alreadyTried: [ID]! #will include all networks returned
    }

    type NetworkGenealogy implements Resource {
      id: ID!
      ancestor: Network
      descendant: Network
    }

    input NetworkGenealogyInput {
      ancestor: ResourceReferenceInput!
      descendant: ResourceReferenceInput!
    }

    extend type Network {
      possibleAncestors(
        alreadyTried: [ID]!
        limit: Int # will default to 5
      ): [CandidateSearchResult]!
      possibleDescendants(
        alreadyTried: [ID]!
        limit: Int # will default to 5
      ): [CandidateSearchResult]!
    }
  `,
  resolvers: {
    NetworkGenealogy: {
      ancestor: {
        resolve: async ({ancestor}, __, {workspace}) => {
          const result = await workspace.get("networks", ancestor.id);
          return result;
        }
      },
      descendant: {
        resolve: async ({descendant}, __, {workspace}) =>
          await workspace.get("networks", descendant.id)
      }
    },
    Network: {
      possibleAncestors: {
        resolve: async ({id}, {limit, alreadyTried}, {workspace}) => {
          const network = await workspace.get("networks", id);
          const queryLimit = limit ? limit : 5;
          const result = await workspace.find("networks", {
            selector: {
              "historicBlock.height": {
                $gte: null,
                $lt: network.historicBlock.height,
                $ne: network.historicBlock.height
              },
              "networkId": network.networkId,
              "id": {
                $nin: alreadyTried
              }
            },
            sort: [{"historicBlock.height": "desc"}],
            limit: queryLimit
          });

          let untriedNetworks = result.map(network => {
            return {
              network,
              alreadyTried: alreadyTried
            };
          });

          return untriedNetworks;
        }
      },
      possibleDescendants: {
        resolve: async ({id}, {limit, alreadyTried}, {workspace}) => {
          const network = await workspace.get("networks", id);
          const queryLimit = limit ? limit : 5;
          const result = await workspace.find("networks", {
            selector: {
              "historicBlock.height": {
                $gte: null,
                $gt: network.historicBlock.height,
                $ne: network.historicBlock.height
              },
              "networkId": network.networkId,
              "id": {
                $nin: alreadyTried
              }
            },
            sort: [{"historicBlock.height": "asc"}],
            limit: queryLimit
          });

          let untriedNetworks = result.map(network => {
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
