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
  query findAncestorCandidates($id: ID!, $alreadyTried: [ID]!) {
    network(id: $id) {
      possibleAncestors(alreadyTried: $alreadyTried) {
        network {
          id
          historicBlock {
            hash
            height
          }
        }
        alreadyTried {
          id
        }
      }
    }
  }
`;

export const FindDescendants = gql`
  query findAncestorCandidates($id: ID!, $alreadyTried: [ID]!) {
    network(id: $id) {
      possibleDescendants(alreadyTried: $alreadyTried) {
        network {
          id
          historicBlock {
            hash
            height
          }
        }
        alreadyTried {
          id
        }
      }
    }
  }
`;
