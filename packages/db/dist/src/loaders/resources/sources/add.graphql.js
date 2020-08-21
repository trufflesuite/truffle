"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddSources = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.AddSources = graphql_tag_1.default `
  input SourceInput {
    contents: String!
    sourcePath: String
  }

  mutation AddSource($sources: [SourceInput!]!) {
    workspace {
      sourcesAdd(input: { sources: $sources }) {
        sources {
          id
          contents
          sourcePath
        }
      }
    }
  }
`;
//# sourceMappingURL=add.graphql.js.map