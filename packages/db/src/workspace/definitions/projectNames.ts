import gql from "graphql-tag";

import { Definition } from "./types";

export const projectNames: Definition<"projectNames"> = {
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
        resolve: ({ project: { id } }, _, { workspace }) =>
          workspace.get("projects", id)
      },
      nameRecord: {
        resolve: ({ nameRecord: { id } }, _, { workspace }) =>
          workspace.get("nameRecords", id)
      }
    }
  }
};
