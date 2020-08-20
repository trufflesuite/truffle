"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignProjectNames = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.AssignProjectNames = graphql_tag_1.default`
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
//# sourceMappingURL=assign.graphql.js.map
