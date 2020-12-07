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
  idFields: ["resource", "previous"],
  typeDefs: gql`
    type NameRecord implements Resource {
      resource: Named!
      previous: NameRecord
    }

    input NameRecordInput {
      resource: TypedResourceReferenceInput!
      previous: ResourceReferenceInput
    }
  `,

  resolvers: {
    NameRecord: {
      resource: {
        resolve: async ({ resource: { id, type } }, _, { workspace }) => {
          debug("Resolving NameRecord.resource...");

          const collectionName = camelCase(plural(type)) as CollectionName;

          const result = await workspace.get(collectionName, id);

          debug("Resolved NameRecord.resource.");
          return result;
        }
      },
      previous: {
        resolve: async ({ previous }, _, { workspace }) => {
          debug("Resolving NameRecord.previous...");

          if (!previous) {
            return;
          }

          const { id } = previous;

          const result = await workspace.get("nameRecords", id);

          debug("Resolved NameRecord.previous.");
          return result;
        }
      }
    }
  }
};
