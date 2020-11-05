import gql from "graphql-tag";

import { Definition } from "./types";

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
        resolve: async ({ ancestor }, _, { workspace }) => {
          const result = await workspace.get("networks", ancestor.id);
          return result;
        }
      },
      descendant: {
        resolve: async ({ descendant }, _, { workspace }) =>
          await workspace.get("networks", descendant.id)
      }
    },
    Network: {
      possibleAncestors: {
        resolve: async ({ id }, { limit, alreadyTried }, { workspace }) => {
          const network = await workspace.get("networks", id);
          const result = await workspace.find("networks", {
            selector: {
              "historicBlock.height": {
                $lt: network.historicBlock.height
              },
              "networkId": network.networkId,
              "id": {
                $nin: alreadyTried
              }
            },
            // sort: [{ "historicBlock.height": "desc" }],
            limit: limit ? limit : 5
            // use_index: "networks-index"
          });

          let untriedNetworks = result
            .filter(({ id }) => !alreadyTried.includes(id))
            .sort((a, b) => {
              return b.historicBlock.height - a.historicBlock.height;
            });

          return untriedNetworks;
        }
      },
      possibleDescendants: {
        resolve: async ({ id }, { limit, alreadyTried }, { workspace }) => {
          const network = await workspace.get("networks", id);
          const result = await workspace.find("networks", {
            selector: {
              "historicBlock.height": {
                $gt: network.historicBlock.height
              },
              "networkId": network.networkId
            },
            limit: limit ? limit : 5
            // sort: [{ "historicBlock.height": "asc" }],
            // use_index: "networks-index"
          });

          let untriedNetworks = result
            .filter(({ id }) => !alreadyTried.includes(id))
            .sort((a, b) => {
              return a.historicBlock.height - b.historicBlock.height;
            });

          return untriedNetworks;
        }
      }
    },
    CandidateSearchResult: {
      network: {
        resolve: async (network, _, {}) => {
          console.log("in network resolver...");
          return network;
        }
      },
      alreadyTried: {
        resolve: ({}, alreadyTried, {}) => {
          console.debug(
            "resolving already tried " + JSON.stringify(alreadyTried)
          );
          return [];
        }
      }
    }
  }
};
