import gql from "graphql-tag";

import { Definition } from "./types";

export const projects: Definition<"projects"> = {
  createIndexes: [],
  idFields: ["directory"],
  typeDefs: gql`
    type Project implements Resource {
      id: ID!

      directory: String!

      contract(name: String!): Contract
      network(name: String!): Network
      resolve(type: String, name: String): [NameRecord] # null means unknown type
    }

    input ProjectInput {
      directory: String!
    }
  `,
  resolvers: {
    Project: {
      resolve: {
        resolve: async ({ id }, { name, type }, { workspace }) => {
          const results = await workspace.find("projectNames", {
            selector: { "project.id": id, name, type }
          });
          const nameRecordIds = results.map(({ nameRecord: { id } }) => id);
          return await workspace.find("nameRecords", {
            selector: {
              id: { $in: nameRecordIds }
            }
          });
        }
      },
      network: {
        resolve: async ({ id }, { name }, { workspace }) => {
          const results = await workspace.find("projectNames", {
            selector: { "project.id": id, name, "type": "Network" }
          });
          const nameRecordIds = results.map(({ nameRecord: { id } }) => id);
          const nameRecords = await workspace.find("nameRecords", {
            selector: {
              id: { $in: nameRecordIds }
            }
          });

          if (nameRecords.length === 0) {
            return;
          }
          const { resource } = nameRecords[0];

          return await workspace.get("networks", resource.id);
        }
      },
      contract: {
        resolve: async ({ id }, { name }, { workspace }) => {
          const results = await workspace.find("projectNames", {
            selector: { "project.id": id, name, "type": "Contract" }
          });
          const nameRecordIds = results.map(({ nameRecord: { id } }) => id);
          const nameRecords = await workspace.find("nameRecords", {
            selector: {
              id: { $in: nameRecordIds }
            }
          });

          if (nameRecords.length === 0) {
            return;
          }
          const { resource } = nameRecords[0];
          return await workspace.get("contracts", resource.id);
        }
      }
    }
  }
};
