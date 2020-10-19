import gql from "graphql-tag";

import { Definition } from "./types";

export const networks: Definition<"networks"> = {
  createIndexes: [],
  idFields: ["networkId", "historicBlock"],
  typeDefs: gql`
    type Network implements Resource & Named {
      id: ID!
      name: String!
      networkId: NetworkId!
      historicBlock: Block!
      fork: Network
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
  `
};
