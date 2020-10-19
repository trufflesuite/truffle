import gql from "graphql-tag";

export const AddNetworks = gql`
  mutation AddNetworks($networks: [NetworkInput!]!) {
    networksAdd(input: { networks: $networks }) {
      networks {
        id
        networkId
        historicBlock {
          height
          hash
        }
      }
    }
  }
`;
