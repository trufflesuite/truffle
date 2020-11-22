import {logger} from "@truffle/db/logger";
const debug = logger("db:resources:nameRecords");

import gql from "graphql-tag";
import camelCase from "camel-case";
import {plural} from "pluralize";

import {Definition, CollectionName} from "./types";

export const nameRecords: Definition<"nameRecords"> = {
  createIndexes: [],
  idFields: ["resource", "previous"],
  typeDefs: gql`
    type NameRecord implements Resource {
      id: ID!
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
        resolve: async ({resource: {type, id}}, _, {workspace}) => {
          debug("Resolving NameRecord.resource...");
          debug("type %o", type);

          const collectionName = camelCase(plural(type)) as CollectionName;

          const result = await workspace.get(collectionName, id);

          debug("Resolved NameRecord.resource.");
          return result;
        }
      },
      previous: {
        resolve: async ({previous}, _, {workspace}) => {
          debug("Resolving NameRecord.previous...");

          if (!previous) {
            return;
          }

          const {id} = previous;

          const result = await workspace.get("nameRecords", id);

          debug("Resolved NameRecord.previous.");
          return result;
        }
      }
    }
  }
};
