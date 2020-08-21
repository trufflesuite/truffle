"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddContracts = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.AddContracts = graphql_tag_1.default `
  input AbiInput {
    json: String!
    items: [String]
  }

  input ContractCompilationInput {
    id: ID!
  }

  input ContractProcessedSourceInput {
    index: FileIndex
  }

  input ContractBytecodeInput {
    id: ID!
  }

  input LinkReferenceInput {
    bytecode: ID!
    index: FileIndex
  }

  input ContractInput {
    name: String
    abi: AbiInput
    compilation: ContractCompilationInput
    processedSource: ContractProcessedSourceInput
    createBytecode: ContractBytecodeInput
    callBytecode: ContractBytecodeInput
  }

  mutation AddContracts($contracts: [ContractInput!]!) {
    workspace {
      contractsAdd(input: { contracts: $contracts }) {
        contracts {
          id
          name
          abi {
            json
          }
          processedSource {
            source {
              contents
              sourcePath
            }
            ast {
              json
            }
          }
          compilation {
            compiler {
              name
              version
            }
            contracts {
              name
              source {
                contents
                sourcePath
              }
              ast {
                json
              }
            }
            sources {
              contents
              sourcePath
            }
          }
          createBytecode {
            id
            bytes
            linkReferences {
              offsets
              name
              length
            }
          }
          callBytecode {
            id
            bytes
            linkReferences {
              offsets
              name
              length
            }
          }
        }
      }
    }
  }
`;
//# sourceMappingURL=add.graphql.js.map