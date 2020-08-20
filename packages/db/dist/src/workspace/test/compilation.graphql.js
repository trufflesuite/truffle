"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetAllCompilations = exports.GetCompilationWithContracts = exports.GetCompilation = exports.AddCompilation = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.AddCompilation = graphql_tag_1.default`
  mutation AddCompilation(
    $compilerName: String!
    $compilerVersion: String!
    $sourceId: ID!
    $abi: String!
    $sourceMap: String!
  ) {
    compilationsAdd(
      input: {
        compilations: [
          {
            compiler: { name: $compilerName, version: $compilerVersion }
            sourceMaps: [{ json: $sourceMap }]
            processedSources: [
              {
                name: "testing"
                ast: { json: $abi }
                source: { id: $sourceId }
              }
            ]
            sources: [{ id: $sourceId }]
          }
        ]
      }
    ) {
      compilations {
        id
        compiler {
          name
        }
        sources {
          contents
        }
        sourceMaps {
          json
        }
        processedSources {
          source {
            contents
            sourcePath
          }
          ast {
            json
          }
        }
      }
    }
  }
`;
exports.GetCompilation = graphql_tag_1.default`
  query GetCompilation($id: ID!) {
    compilation(id: $id) {
      id
      compiler {
        name
        version
      }
      sources {
        id
        contents
      }
      processedSources {
        source {
          contents
        }
      }
    }
  }
`;
exports.GetCompilationWithContracts = graphql_tag_1.default`
  query GetCompilation($id: ID!) {
    compilation(id: $id) {
      id
      compiler {
        name
        version
      }
      sources {
        id
        contents
      }
      processedSources {
        contracts {
          id
        }
        source {
          contents
        }
      }
    }
  }
`;
exports.GetAllCompilations = graphql_tag_1.default`
  query getAllCompilations {
    compilations {
      compiler {
        name
        version
        settings
      }

      sources {
        id
      }
    }
  }
`;
//# sourceMappingURL=compilation.graphql.js.map
