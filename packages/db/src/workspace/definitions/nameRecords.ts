import gql from "graphql-tag";

import { Definition } from "./types";

export const nameRecords: Definition<"nameRecords"> = {
  createIndexes: [],
  idFields: ["name", "type", "resource", "previous"],
  typeDefs: gql`
    type NameRecord implements Resource {
      id: ID!
      name: String!
      type: String!
      resource: Named!
      previous: NameRecord
    }

    input NameRecordInput {
      name: String!
      type: String!
      resource: ResourceReferenceInput!
      previous: ResourceReferenceInput
    }
  `,
  resolvers: {
    NameRecord: {
      resource: {
        resolve: async ({ type, resource: { id } }, _, { workspace }) => {
          switch (type) {
            case "Contract":
              return await workspace.contract({ id });
            case "Network":
              return await workspace.network({ id });
            default:
              return null;
          }
        }
      },
      previous: {
        resolve: ({ id }, _, { workspace }) => workspace.nameRecord({ id })
      }
    }
  }
};
