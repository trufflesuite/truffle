import gql from "graphql-tag";

export const GetContract = gql`
  query GetContract($id: ID!) {
    contract(id: $id) {
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
`;
