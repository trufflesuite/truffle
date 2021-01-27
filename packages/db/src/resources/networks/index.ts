import { logger } from "@truffle/db/logger";
const debug = logger("db:resources:networks");

import gql from "graphql-tag";

import type { Definition } from "../types";

import { resolveRelations } from "./resolveRelations";
import { resolvePossibleRelations } from "./resolvePossibleRelations";

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
        minimumHeight: Int # default any height
        includeSelf: Boolean # default false
        onlyEarliest: Boolean # default false
      ): [Network]!

      descendants(
        limit: Int # default all
        maximumHeight: Int # default no height
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
