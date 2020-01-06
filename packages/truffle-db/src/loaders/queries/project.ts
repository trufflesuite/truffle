import gql from "graphql-tag";

export const GetProject = gql`
  query GetProject($directory: String!) {
    workspace {
      project(directory: $directory) {
        names {
          type
          name
          id
        }
      }
    }
  }
`;

export const AddProject = gql`
  mutation AddProject($directory: String) {
    workspace {
      projectAdd(input: { directory: $directory }) {
        directory
        id
      }
    }
  }
`;

export const SetProjectNames = gql`
  input ProjectInput {
    directory: String!
  }

  input ProjectNamesSetNameRecordInput {
    id: ID!
  }

  input ProjectNamesSetInput {
    project: ProjectInput!
    nameRecords: [ProjectNamesSetNameRecordInput!]!
  }

  mutation AddProjectNames(
    $project: ProjectInput!
    $nameRecords: [ProjectNamesSetNameRecordInput!]!
  ) {
    workspace {
      projectNamesSet(input: { project: $project, nameRecords: $nameRecords }) {
        nameRecords {
          name
          resource {
            id
            ... on Network {
              networkId
            }
            ... on Contract {
              name
            }
          }
          previous {
            resource {
              id
            }
          }
        }
        project {
          names {
            type
            name
            id
          }
          directory
          id
        }
      }
    }
  }
`;
