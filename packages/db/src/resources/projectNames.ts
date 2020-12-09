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
    resourcesMutate: "projectNamesAssign",
    ResourcesMutate: "ProjectNamesAssign"
  },
  createIndexes: [
    {
      fields: ["project.id"]
    },
    {
      fields: ["project.id", "key.type"]
    },
    {
      fields: ["project.id", "key.name", "key.type"]
    }
  ],
  idFields: ["project", "key"],
  mutable: true,
  typeDefs: gql`
    type ProjectName implements Resource {
      project: Project!
      key: ProjectNameKey!
      nameRecord: NameRecord!
    }

    type ProjectNameKey {
      name: String!
      type: String!
    }

    input ProjectNameInput {
      project: ResourceReferenceInput!
      key: ProjectNameKeyInput!
      nameRecord: ResourceReferenceInput!
    }

    input ProjectNameKeyInput {
      name: String!
      type: String!
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
