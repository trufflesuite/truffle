import gql from "graphql-tag";

export const GetNetwork = gql`
  query GetNetwork($id: ID!) {
    network(id: $id) {
      id
      name
      networkId
    }
  }
`;
