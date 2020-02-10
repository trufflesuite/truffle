import gql from "graphql-tag";

export const GetNetwork = gql`
  query GetNetwork($id: ID!) {
    network(id: $id) {
      networkId
      id
    }
  }
`;

export const GetAllNetworks = gql`
  query getAllNetworks {
    networks {
      id
      networkId
    }
  }
`;

export const AddNetworks = gql`
  mutation AddNetworks(
    $networkId: NetworkId!
    $height: Int!
    $hash: String!
    $name: String!
  ) {
    networksAdd(
      input: {
        networks: [
          {
            name: $name
            networkId: $networkId
            historicBlock: { height: $height, hash: $hash }
          }
        ]
      }
    ) {
      networks {
        networkId
        id
      }
    }
  }
`;
