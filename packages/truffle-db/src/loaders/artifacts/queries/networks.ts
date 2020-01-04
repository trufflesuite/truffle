import gql from "graphql-tag";

export const AddNetworks = gql`
  input HistoricBlockInput {
    height: Int!
    hash: String!
  }

  input NetworkInput {
    name: String
    networkId: NetworkId!
    historicBlock: HistoricBlockInput!
  }

  mutation AddNetworks($networks: [NetworkInput!]!) {
    workspace {
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
  }
`;
