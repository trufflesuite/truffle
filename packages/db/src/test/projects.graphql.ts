import gql from "graphql-tag";

export const GetProject = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      directory
    }
  }
`;

export const LookupNames = gql`
  query LookupNames(
    $projectId: ID!
    $networkName: String!
    $contractName: String!
  ) {
    project(id: $projectId) {
      network(name: $networkName) {
        name
      }
      contract(name: $contractName) {
        name
      }
    }
  }
`;

export const AddProject = gql`
  mutation AddProject($directory: String!) {
    projectsAdd(input: { projects: [{ directory: $directory }] }) {
      projects {
        directory
        id
      }
    }
  }
`;

export const AssignProjectName = gql`
  mutation AssignProjectName(
    $projectId: ID!
    $name: String!
    $type: String!
    $nameRecordId: ID!
  ) {
    projectNamesAssign(
      input: {
        projectNames: [
          {
            project: { id: $projectId }
            key: { name: $name, type: $type }
            nameRecord: { id: $nameRecordId }
          }
        ]
      }
    ) {
      projectNames {
        project {
          id
        }
        nameRecord {
          resource {
            name
            id
          }
        }
      }
    }
  }
`;
