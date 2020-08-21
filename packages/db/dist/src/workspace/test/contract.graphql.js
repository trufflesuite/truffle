"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddContracts = exports.GetAllContracts = exports.GetContract = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.GetContract = graphql_tag_1.default `
  query getContract($id: ID!) {
    contract(id: $id) {
      name
      abi {
        json
      }
      processedSource {
        source {
          contents
        }
        ast {
          json
        }
      }
    }
  }
`;
exports.GetAllContracts = graphql_tag_1.default `
  query getAllContracts {
    contracts {
      name
      processedSource {
        name
      }
      source {
        id
      }
      abi {
        json
      }
      compilation {
        compiler {
          version
        }
      }
      processedSource {
        source {
          sourcePath
        }
      }
    }
  }
`;
exports.AddContracts = graphql_tag_1.default `
  mutation addContracts(
    $contractName: String
    $compilationId: ID!
    $bytecodeId: ID!
    $abi: String!
  ) {
    contractsAdd(
      input: {
        contracts: [
          {
            name: $contractName
            abi: { json: $abi }
            compilation: { id: $compilationId }
            processedSource: { index: 0 }
            constructor: { createBytecode: { bytecode: { id: $bytecodeId } } }
          }
        ]
      }
    ) {
      contracts {
        id
        name
        processedSource {
          name
          source {
            contents
          }
          ast {
            json
          }
        }
        constructor {
          createBytecode {
            bytecode {
              bytes
            }
            linkValues {
              value
              linkReference {
                name
              }
            }
          }
        }
      }
    }
  }
`;
//# sourceMappingURL=contract.graphql.js.map