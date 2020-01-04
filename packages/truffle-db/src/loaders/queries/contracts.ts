import gql from "graphql-tag";

export const AddContracts = gql`
  input AbiInput {
    json: String!
    items: [String]
  }

  input ContractCompilationInput {
    id: ID!
  }

  input ContractSourceContractInput {
    index: FileIndex
  }

  input ContractConstructorBytecodeInput {
    id: ID!
  }

  input LinkReferenceInput {
    bytecode: ID!
    index: FileIndex
  }

  input ContractConstructorLinkValueInput {
    value: Address!
    LinkReference: LinkReferenceInput
  }

  input ContractConstructorLinkedBytecodeInput {
    bytecode: ContractConstructorBytecodeInput!
    linkValues: [ContractContructorLinkValueInput]
  }

  input ContractConstructorInput {
    createBytecode: ContractConstructorLinkedBytecodeInput!
  }

  input ContractInput {
    name: String
    abi: AbiInput
    compilation: ContractCompilationInput
    sourceContract: ContractSourceContractInput
    constructor: ContractConstructorInput
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
          sourceContract {
            name
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
          constructor {
            createBytecode {
              bytecode {
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
    }
  }
`;
