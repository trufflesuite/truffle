import gql from "graphql-tag";

export const GetSource = gql`
  query GetSource($id: ID!) {
    source(id: $id) {
      id
      contents
      sourcePath
    }
  }
`;

export const GetAllSources = gql`
  query getAllSources {
    sources {
      id
      sourcePath
      contents
      ast {
        json
      }
    }
  }
`;

export const AddSource = gql`
  mutation AddSource($contents: String!, $sourcePath: String) {
    sourcesAdd(
      input: { sources: [{ contents: $contents, sourcePath: $sourcePath }] }
    ) {
      sources {
        id
      }
    }
  }
`;
