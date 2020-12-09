import { logger } from "@truffle/db/logger";
const debug = logger("db:resources:projects");

import gql from "graphql-tag";

import { Definition } from "./types";

export const projects: Definition<"projects"> = {
  names: {
    resource: "project",
    Resource: "Project",
    resources: "projects",
    Resources: "Projects",
    resourcesMutate: "projectsAdd",
    ResourcesMutate: "ProjectsAdd"
  },
  createIndexes: [],
  idFields: ["directory"],
  typeDefs: gql`
    type Project implements Resource {
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
          debug("Resolving Project.resolve...");

          const results = await workspace.find("projectNames", {
            selector: {
              "project.id": id,
              "key.name": name,
              "key.type": type
            }
          });

          const nameRecordIds = results.map(({ nameRecord: { id } }) => id);

          const result = await workspace.find("nameRecords", {
            selector: {
              id: { $in: nameRecordIds }
            }
          });

          debug("Resolved Project.resolve.");
          return result;
        }
      },
      network: {
        resolve: async ({ id }, { name }, { workspace }) => {
          debug("Resolving Project.network...");
          debug("name %o", name);
          debug("project id %o", id);

          const testResults = await workspace.find("projectNames", {
            selector: {
              "project.id": id
            }
          });
          debug("test results %O", testResults);

          const results = await workspace.find("projectNames", {
            selector: {
              "project.id": id,
              "key.name": name,
              "key.type": "Network"
            }
          });
          debug("network results %O", results);
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

          const result = await workspace.get("networks", resource.id);

          debug("Resolved Project.network.");
          return result;
        }
      },
      contract: {
        resolve: async ({ id }, { name }, { workspace }) => {
          debug("Resolving Project.contract...");

          const results = await workspace.find("projectNames", {
            selector: {
              "project.id": id,
              "key.name": name,
              "key.type": "Contract"
            }
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

          const result = await workspace.get("contracts", resource.id);

          debug("Resolved Project.contract.");
          return result;
        }
      }
    }
  }
};
