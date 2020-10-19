import gql from "graphql-tag";

export const AddProjects = gql`
  mutation AddProjects($projects: [ProjectInput!]!) {
    projectsAdd(input: { projects: $projects }) {
      projects {
        id
        directory
      }
    }
  }
`;
