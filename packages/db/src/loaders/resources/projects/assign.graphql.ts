import gql from "graphql-tag";

export const AssignProjectNames = gql`
  mutation AssignProjectNames($projectNames: [ProjectNameInput!]!) {
    projectNamesAssign(input: { projectNames: $projectNames }) {
      projectNames {
        name
        type
        nameRecord {
          resource {
            id
          }
        }
      }
    }
  }
`;
