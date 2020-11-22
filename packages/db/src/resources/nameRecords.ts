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

      history(limit: Int, includeSelf: Boolean): [NameRecord]!
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
      },
      history: {
        async resolve(
          {id, resource, previous},
          {limit, includeSelf = false},
          {workspace}
        ) {
          debug(
            "Resolving NameRecord.history with limit: %s...",
            typeof limit === "number" ? `${limit}` : "none"
          );

          let depth = 0;
          const nameRecords = includeSelf ? [{id, resource, previous}] : [];

          debug("previous %o", previous);
          while (previous && (typeof limit !== "number" || depth < limit)) {
            const nameRecord = await workspace.get("nameRecords", previous.id);
            // @ts-ignore
            nameRecords.push(nameRecord);

            previous = nameRecord.previous;
            depth++;
          }

          debug(
            "Resolved NameRecord.history with limit: %s.",
            typeof limit === "number" ? `${limit}` : "none"
          );
          return nameRecords;
        }
      }
    }
  }
};
