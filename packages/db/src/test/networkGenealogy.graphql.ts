import gql from "graphql-tag";

export const AddNetworkGenealogies = gql`
  mutation AddNetworkGenealogies($ancestor: ID!, $descendant: ID!) {
    networkGenealogiesAdd(
      input: {
        networkGenealogies: [
          { ancestor: { id: $ancestor }, descendant: { id: $descendant } }
        ]
      }
    ) {
      networkGenealogies {
        id
        ancestor {
          id
          name
        }
        descendant {
          id
          name
        }
      }
    }
  }
`;

export const FindAncestors = gql`
  query findAncestorCandidates($id: ID!, $alreadyTried: [ID]!, $limit: Int) {
    network(id: $id) {
      possibleAncestors(alreadyTried: $alreadyTried, limit: $limit) {
        network {
          id
          historicBlock {
            hash
            height
          }
          networkId
        }
        alreadyTried {
          id
        }
      }
    }
  }
`;

export const FindDescendants = gql`
  query findDescendantCandidates($id: ID!, $alreadyTried: [ID]!, $limit: Int) {
    network(id: $id) {
      possibleDescendants(alreadyTried: $alreadyTried, limit: $limit) {
        network {
          id
          historicBlock {
            hash
            height
          }
          networkId
        }
        alreadyTried {
          id
        }
      }
    }
  }
`;
