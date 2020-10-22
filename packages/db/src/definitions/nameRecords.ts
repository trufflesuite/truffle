import gql from "graphql-tag";
import camelCase from "camel-case";
import { plural } from "pluralize";

import { Definition, CollectionName } from "./types";

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
          const collectionName = camelCase(plural(type)) as CollectionName;

          return await workspace.get(collectionName, id);
        }
      },
      previous: {
        resolve: ({ id }, _, { workspace }) => workspace.get("nameRecords", id)
      }
    }
  }
};
