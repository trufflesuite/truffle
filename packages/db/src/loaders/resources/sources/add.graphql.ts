import gql from "graphql-tag";

export const AddSources = gql`
  mutation AddSource($sources: [SourceInput!]!) {
    sourcesAdd(input: { sources: $sources }) {
      sources {
        id
        contents
        sourcePath
      }
    }
  }
`;
