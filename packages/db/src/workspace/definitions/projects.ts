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
          return await workspace.projectNames({
            project: { id },
            name,
            type
          });
        }
      },
      network: {
        resolve: async ({ id }, { name }, { workspace }) => {
          const nameRecords = await workspace.projectNames({
            project: { id },
            type: "Network",
            name
          });
          if (nameRecords.length === 0) {
            return;
          }
          const { resource } = nameRecords[0];
          return await workspace.network(resource);
        }
      },
      contract: {
        resolve: async ({ id }, { name }, { workspace }) => {
          const nameRecords = await workspace.projectNames({
            project: { id },
            type: "Contract",
            name
          });
          if (nameRecords.length === 0) {
            return;
          }
          const { resource } = nameRecords[0];
          return await workspace.contract(resource);
        }
      }
    }
  }
};
