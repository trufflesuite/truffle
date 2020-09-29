import gql from "graphql-tag";

export const ResolveProjectName = gql`
  query ResolveProjectName($projectId: ID!, $type: String!, $name: String!) {
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
