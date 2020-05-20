import gql from "graphql-tag";

export const AddContracts = gql`
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
            bytes
            linkReferences {
              offsets
              name
              length
            }
          }
          callBytecode {
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
