import gql from "graphql-tag";

export const AddNetworkGenealogies = gql`
  mutation AddNetworkGenealogies(
    $networkGenealogies: [NetworkGenealogyInput!]!
  ) {
    networkGenealogiesAdd(input: { networkGenealogies: $networkGenealogies }) {
      networkGenealogies {
        id
        ancestor {
          networkId
          historicBlock {
            height
          }
        }
        descendant {
          networkId
          historicBlock {
            height
          }
        }
      }
    }
  }
`;
