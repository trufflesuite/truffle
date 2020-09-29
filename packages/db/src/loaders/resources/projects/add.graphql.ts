import gql from "graphql-tag";

export const AddProjects = gql`
  input ProjectInput {
    directory: String!
  }
  mutation AddProjects($projects: [ProjectInput!]!) {
    workspace {
      projectsAdd(input: { projects: $projects }) {
        projects {
          id
          directory
        }
      }
    }
  }
`;
