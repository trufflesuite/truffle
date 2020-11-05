import gql from "graphql-tag";

export const FindAncestors = gql`
  query findAncestorCandidates($id: ID!, $alreadyTried: [ID]!, $limit: Int){
    network($id) {
      possibleAncestors(alreadyTried: $alreadyTried, limit: $limit) {
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
  query findDescendantCandidates($id: ID!, $alreadyTried: [ID]!, $limit: Int){
    network($id) {
      possibleDescendants(alreadyTried: $alreadyTried, limit: $limit) {
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
