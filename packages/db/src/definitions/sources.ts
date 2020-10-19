import gql from "graphql-tag";

import { Definition } from "./types";

export const sources: Definition<"sources"> = {
  createIndexes: [],
  idFields: ["contents", "sourcePath"],
  typeDefs: gql`
    type Source implements Resource {
      id: ID!
      sourcePath: String
      contents: String!
    }

    input SourceInput {
      contents: String!
      sourcePath: String
    }
  `
};
