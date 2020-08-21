"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddContractInstances = exports.GetAllContractInstances = exports.GetContractInstance = void 0;
const graphql_tag_1 = __importDefault(require("graphql-tag"));
exports.GetContractInstance = graphql_tag_1.default `
  query GetContractInstance($id: ID!) {
    contractInstance(id: $id) {
      address
      network {
        networkId
      }
      contract {
        name
      }
      creation {
        transactionHash
        constructor {
          createBytecode {
            bytecode {
              bytes
            }
          }
        }
      }
    }
  }
`;
exports.GetAllContractInstances = graphql_tag_1.default `
  query getAllContractInstances {
    contractInstances {
      id
      address
      network {
        name
        networkId
      }
      contract {
        id
        name
      }
    }
  }
`;
exports.AddContractInstances = graphql_tag_1.default `
  input ContractInstanceNetworkInput {
    id: ID!
  }

  input ContractInstanceContractInput {
    id: ID!
  }

  input BytecodeInput {
    id: ID!
  }

  input ContractInstanceCreationConstructorBytecodeInput {
    bytecode: BytecodeInput!
  }

  input ContractInstanceCreationConstructorInput {
    createBytecode: ContractInstanceCreationConstructorBytecodeInput!
  }

  input ContractInstanceCreationInput {
    transactionHash: TransactionHash!
    constructor: ContractInstanceCreationConstructorInput!
  }

  input ContractInstanceInput {
    address: Address!
    network: ContractInstanceNetworkInput!
    creation: ContractInstanceCreationInput
    contract: ContractInstanceContractInput
  }
  mutation AddContractInstances($contractInstances: [ContractInstanceInput!]!) {
    contractInstancesAdd(input: { contractInstances: $contractInstances }) {
      contractInstances {
        address
        network {
          networkId
        }
        contract {
          name
        }
        creation {
          transactionHash
          constructor {
            createBytecode {
              bytecode {
                bytes
              }
            }
          }
        }
      }
    }
  }
`;
//# sourceMappingURL=contractInstance.graphql.js.map