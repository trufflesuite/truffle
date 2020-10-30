import gql from "graphql-tag";

export const AddCompilations = gql`
  mutation AddCompilations($compilations: [CompilationInput!]!) {
    compilationsAdd(input: { compilations: $compilations }) {
      compilations {
        id
      }
    }
  }
`;
