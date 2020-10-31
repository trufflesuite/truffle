import gql from "graphql-tag";

import { Definition } from "./types";

export const networkGenealogies: Definition<"networkGenealogies"> = {
  createIndexes: [{ fields: ["historicBlock"] }],
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
          console.debug("result? " + JSON.stringify(result));
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
        resolve: async ({ id, limit }, alreadyTried, { workspace }) => {
          const network = await workspace.get("networks", id);
          const result = await workspace.find("networks", {
            selector: {
              "networkId": network.networkId,
              "historicBlock.height": {
                $lt: network.historicBlock.height
              }
              // "id": {
              //   $nin: alreadyTried
              // }
            },
            limit: limit ? limit : 5
            // sort: [{ "historicBlock.height": "desc" }]
          });

          let untriedNetworks = result
            .filter(({ id }) => !alreadyTried.alreadyTried.includes(id))
            .sort((a, b) => {
              return b.historicBlock.height - a.historicBlock.height;
            });

          return untriedNetworks;
        }
      },
      possibleDescendants: {
        resolve: async ({ id, limit }, alreadyTried, { workspace }) => {
          const network = await workspace.get("networks", id);
          const result = await workspace.find("networks", {
            selector: {
              "networkId": network.networkId,
              "historicBlock.height": {
                $gt: network.historicBlock.height
              }
            },
            limit: limit ? limit : 5
            // sort: [{ "historicBlock.height": "desc" }]
          });

          let untriedNetworks = result
            .filter(({ id }) => !alreadyTried.alreadyTried.includes(id))
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
