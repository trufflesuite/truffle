import gql from "graphql-tag";

export const FindContracts = gql`
  query FindContracts($ids: [ID!]!) {
    contracts(filter: { ids: $ids }) {
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
