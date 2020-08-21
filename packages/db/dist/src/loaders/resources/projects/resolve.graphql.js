"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResolveProjectName = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.ResolveProjectName = graphql_tag_1.default `
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
//# sourceMappingURL=resolve.graphql.js.map