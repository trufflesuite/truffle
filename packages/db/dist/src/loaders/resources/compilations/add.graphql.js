"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddCompilations = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.AddCompilations = graphql_tag_1.default`
  input CompilerInput {
    name: String
    version: String
    settings: Object
  }

  input CompilationSourceInput {
    id: ID!
  }

  input CompilationProcessedSourceSourceInput {
    id: ID!
  }

  input CompilationProcessedSourceAstInput {
    json: String!
  }

  input CompilationSourceMapInput {
    json: String!
  }

  input CompilationProcessedSourceInput {
    name: String
    source: CompilationProcessedSourceSourceInput
    ast: CompilationProcessedSourceAstInput
  }

  input CompilationInput {
    compiler: CompilerInput!
    sources: [CompilationSourceInput!]!
    processedSources: [CompilationProcessedSourceInput!]
    sourceMaps: [CompilationSourceMapInput]
  }
  input CompilationsAddInput {
    compilations: [CompilationInput!]!
  }

  mutation AddCompilations($compilations: [CompilationInput!]!) {
    workspace {
      compilationsAdd(input: { compilations: $compilations }) {
        compilations {
          id
        }
      }
    }
  }
`;
//# sourceMappingURL=add.graphql.js.map
