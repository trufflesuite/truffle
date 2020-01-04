import gql from "graphql-tag";

export const AddSources = gql`
  input SourceInput {
    contents: String!
    sourcePath: String
  }

  mutation AddSource($sources: [SourceInput!]!) {
    workspace {
      sourcesAdd(input: { sources: $sources }) {
        sources {
          id
          contents
          sourcePath
        }
      }
    }
  }
`;
