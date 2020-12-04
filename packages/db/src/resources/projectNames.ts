import { logger } from "@truffle/db/logger";
const debug = logger("db:resources:projectNames");

import gql from "graphql-tag";

import { Definition } from "./types";

export const projectNames: Definition<"projectNames"> = {
  names: {
    resource: "projectName",
    Resource: "ProjectName",
    resources: "projectNames",
    Resources: "ProjectNames",
    resourcesMutate: "projectNamesAssign"
  },
  createIndexes: [
    {
      fields: ["project.id"]
    },
    {
      fields: ["project.id", "type"]
    },
    {
      fields: ["project.id", "name", "type"]
    }
  ],
  idFields: ["project", "name", "type"],
  mutable: true,
  typeDefs: gql`
    type ProjectName implements Resource {
      id: ID!
      project: Project!
      name: String!
      type: String!
      nameRecord: NameRecord!
    }

    input ProjectNameInput {
      project: ResourceReferenceInput!
      name: String!
      type: String!
      nameRecord: ResourceReferenceInput!
    }
  `,
  resolvers: {
    ProjectName: {
      project: {
        resolve: async ({ project: { id } }, _, { workspace }) => {
          debug("Resolving ProjectName.project...");

          const result = await workspace.get("projects", id);

          debug("Resolved ProjectName.project.");
          return result;
        }
      },
      nameRecord: {
        resolve: async ({ nameRecord: { id } }, _, { workspace }) => {
          debug("Resolving ProjectName.nameRecord...");

          const result = await workspace.get("nameRecords", id);

          debug("Resolved ProjectName.nameRecord.");
          return result;
        }
      }
    }
  }
};
