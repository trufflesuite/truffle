"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignProjectName = exports.AddProject = exports.LookupNames = exports.GetProject = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.GetProject = graphql_tag_1.default `
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      directory
    }
  }
`;
exports.LookupNames = graphql_tag_1.default `
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
exports.AddProject = graphql_tag_1.default `
  mutation AddProject($directory: String!) {
    projectsAdd(input: { projects: [{ directory: $directory }] }) {
      projects {
        directory
        id
      }
    }
  }
`;
exports.AssignProjectName = graphql_tag_1.default `
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
            name: $name
            type: $type
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
//# sourceMappingURL=projects.graphql.js.map