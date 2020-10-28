import gql from "graphql-tag";

export const GetCompilation = gql`
  query GetCompilation($id: ID!) {
    compilation(id: $id) {
      id
      compiler {
        name
      }
      sourceMaps {
        json
      }
      contracts {
        id
        name
        createBytecode {
          id
          bytes
          linkReferences {
            name
          }
        }
        callBytecode {
          id
          bytes
          linkReferences {
            name
          }
        }
      }
    }
  }
`;
