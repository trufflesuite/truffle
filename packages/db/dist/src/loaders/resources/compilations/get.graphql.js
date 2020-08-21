"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetCompilation = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.GetCompilation = graphql_tag_1.default `
  query GetCompilation($id: ID!) {
    workspace {
      compilation(id: $id) {
        id
        compiler {
          name
        }
        sourceMaps {
          json
        }
        processedSources {
          source {
            sourcePath
          }

          contracts {
            id
            name
            createBytecode {
              id
              bytes
              linkReferences {
                name
              }
            }
            callBytecode {
              id
              bytes
              linkReferences {
                name
              }
            }
          }
        }
      }
    }
  }
`;
//# sourceMappingURL=get.graphql.js.map