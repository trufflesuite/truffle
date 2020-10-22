import gql from "graphql-tag";

import { Definition } from "./types";

export const networkGenealogies: Definition<"networkGenealogies"> = {
  createIndexes: [],
  idFields: ["ancestor", "descendant"],
  typeDefs: gql`
    type NetworkGenealogy implements Resource {
      id: ID!
      ancestor: Network
      descendant: Network
    }

    input NetworkGenealogyInput {
      ancestor: ResourceReferenceInput!
      descendant: ResourceReferenceInput!
    }
  `,
  resolvers: {
    NetworkGenealogy: {
      ancestor: {
        resolve: ({ network: { id } }, _, { workspace }) =>
          workspace.get("networks", id)
      },
      descendant: {
        resolve: ({ network: { id } }, _, { workspace }) =>
          workspace.get("networks", id)
      }
    }
  }
};
