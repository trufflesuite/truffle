import gql from "graphql-tag";

export const AssignProjectNames = gql`
  input ProjectInput {
    id: ID!
  }
  input NameRecordInput {
    id: ID!
  }
  input ProjectNameInput {
    project: ProjectInput!
    name: String!
    type: String!
    nameRecord: NameRecordInput!
  }
  mutation AssignProjectNames($projectNames: [ProjectNameInput!]!) {
    workspace {
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
  }
`;
