"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddSource = exports.GetAllSources = exports.GetSource = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.GetSource = graphql_tag_1.default `
  query GetSource($id: ID!) {
    source(id: $id) {
      id
      contents
      sourcePath
    }
  }
`;
exports.GetAllSources = graphql_tag_1.default `
  query getAllSources {
    sources {
      id
      sourcePath
      contents
      ast {
        json
      }
    }
  }
`;
exports.AddSource = graphql_tag_1.default `
  mutation AddSource($contents: String!, $sourcePath: String) {
    sourcesAdd(
      input: { sources: [{ contents: $contents, sourcePath: $sourcePath }] }
    ) {
      sources {
        id
      }
    }
  }
`;
//# sourceMappingURL=source.graphql.js.map