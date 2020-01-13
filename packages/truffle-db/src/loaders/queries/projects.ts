import gql from "graphql-tag";

export const GetCurrent = gql`
  query GetCurrent($projectId: ID!, $type: String!, $name: String!) {
    workspace {
      project(id: $projectId) {
        resolve(type: $type, name: $name) {
          id
          resource {
            id
            name
          }
        }
      }
    }
  }
`;

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
