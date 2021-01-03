import gql from "graphql-tag";

import { Definition } from "./types";

export const networkGenealogies: Definition<"networkGenealogies"> = {
  names: {
    resource: "networkGenealogy",
    Resource: "NetworkGenealogy",
    resources: "networkGenealogies",
    Resources: "NetworkGenealogies",
    resourcesMutate: "networkGenealogiesAdd",
    ResourcesMutate: "NetworkGenealogiesAdd"
  },
  createIndexes: [
    {
      fields: ["ancestor.id"]
    },
    {
      fields: ["descendant.id"]
    }
  ],
  idFields: ["ancestor", "descendant"],
  typeDefs: gql`
    type NetworkGenealogy implements Resource {
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
        resolve: async ({ ancestor }, __, { workspace }) => {
          const result = await workspace.get("networks", ancestor.id);
          return result;
        }
      },
      descendant: {
        resolve: async ({ descendant }, __, { workspace }) =>
          await workspace.get("networks", descendant.id)
      }
    }
  }
};
