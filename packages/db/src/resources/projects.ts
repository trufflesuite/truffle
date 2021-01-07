import { logger } from "@truffle/db/logger";
const debug = logger("db:resources:projects");

import gql from "graphql-tag";

import { Definition, IdObject, Workspace } from "./types";

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
      contracts: [Contract]!

      network(name: String!): Network
      networks: [Network]!

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
        resolve: async (project, { name }, { workspace }) => {
          debug("Resolving Project.network...");

          const [nameRecord] = await resolve({
            project,
            name,
            type: "Network",
            workspace
          });

          if (!nameRecord) {
            return;
          }

          const { resource } = nameRecord;

          const result = await workspace.get("networks", resource.id);

          debug("Resolved Project.network.");
          return result;
        }
      },
      networks: {
        resolve: async (project, _, { workspace }) => {
          debug("Resolving Project.networks...");

          const nameRecords = await resolve({
            project,
            type: "Network",
            workspace
          });

          const resourceIds = nameRecords.map(({ resource }) => resource.id);

          const result = await workspace.find("networks", {
            selector: { id: { $in: resourceIds } }
          });

          debug("Resolved Project.networks.");
          return result;
        }
      },
      contract: {
        resolve: async (project, { name }, { workspace }) => {
          debug("Resolving Project.contract...");

          const [nameRecord] = await resolve({
            project,
            name,
            type: "Contract",
            workspace
          });

          if (!nameRecord) {
            return;
          }

          const { resource } = nameRecord;

          const result = await workspace.get("contracts", resource.id);

          debug("Resolved Project.contract.");
          return result;
        }
      },
      contracts: {
        resolve: async (project, _, { workspace }) => {
          debug("Resolving Project.contracts...");

          const nameRecords = await resolve({
            project,
            type: "Contract",
            workspace
          });

          const resourceIds = nameRecords.map(({ resource }) => resource.id);

          const result = await workspace.find("contracts", {
            selector: { id: { $in: resourceIds } }
          });

          debug("Resolved Project.contracts.");
          return result;
        }
      }
    }
  }
};

async function resolve(options: {
  project: IdObject<"projects">;
  name?: string;
  type?: string;
  workspace: Workspace;
}) {
  const {
    project: { id },
    name,
    type,
    workspace
  } = options;

  const results = await workspace.find("projectNames", {
    selector: {
      "project.id": id,
      "key.name": name,
      "key.type": type
    }
  });
  const nameRecordIds = results.map(({ nameRecord: { id } }) => id);
  const nameRecords = await workspace.find("nameRecords", {
    selector: {
      id: { $in: nameRecordIds }
    }
  });

  return nameRecords;
}
