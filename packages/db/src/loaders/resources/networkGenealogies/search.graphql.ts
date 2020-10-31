import gql from "graphql-tag";

export const FindAncestors = gql`
  query findAncestorCandidates($id: ID!, $alreadyTried: [ID]!){
    network($id) {
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
  query findDescendantCandidates($id: ID!, $alreadyTried: [ID]!){
    network($id) {
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
