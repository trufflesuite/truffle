import gql from "graphql-tag";

export const AddContracts = gql`
  mutation AddContracts($contracts: [ContractInput!]!) {
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
`;
