import gql from "graphql-tag";

export const FindCompilationContracts = gql`
  query FindCompilations($ids: [ID!]!) {
    compilations(filter: { ids: $ids }) {
      contracts {
        id
      }
    }
  }
`;
