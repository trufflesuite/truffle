"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddProjects = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.AddProjects = graphql_tag_1.default `
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
//# sourceMappingURL=add.graphql.js.map