import { logger } from "@truffle/db/logger";
const debug = logger("db:definitions:nameRecords");

import gql from "graphql-tag";
import camelCase from "camel-case";
import { plural } from "pluralize";

import { Definition, CollectionName } from "./types";

export const nameRecords: Definition<"nameRecords"> = {
  names: {
    resource: "nameRecord",
    Resource: "NameRecord",
    resources: "nameRecords",
    Resources: "NameRecords",
    resourcesMutate: "nameRecordsAdd",
    ResourcesMutate: "NameRecordsAdd"
  },
  createIndexes: [],
  idFields: ["name", "type", "resource", "previous"],
  typeDefs: gql`
    type NameRecord implements Resource {
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
          debug("Resolving NameRecord.resource...");

          const collectionName = camelCase(plural(type)) as CollectionName;

          const result = await workspace.get(collectionName, id);

          debug("Resolved NameRecord.resource.");
          return result;
        }
      },
      previous: {
        resolve: async ({ id }, _, { workspace }) => {
          debug("Resolving NameRecord.previous...");

          const result = await workspace.get("nameRecords", id);

          debug("Resolved NameRecord.previous.");
          return result;
        }
      }
    }
  }
};
