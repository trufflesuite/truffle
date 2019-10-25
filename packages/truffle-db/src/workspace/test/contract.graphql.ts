import gql from "graphql-tag";

export const GetContract = gql`
  query getContract($id:ID!){
      contract(id:$id) {
        name
        abi {
          json
        }
        sourceContract {
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

export const GetAllContracts = gql`
  query getAllContracts {
    contracts {
      name
      sourceContract {
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
      sourceContract {
        source {
          sourcePath
        }
      }
    }
  }
`;

export const AddContracts = gql`
  mutation addContracts($contractName: String, $compilationId: ID!, $bytecodeId:ID!, $abi:String!) {
    contractsAdd(input: {
      contracts: [{
        name: $contractName
        abi: {
          json: $abi
        }
        compilation: {
          id: $compilationId
        }
        sourceContract: {
          index: 0
        }
        constructor: {
          createBytecode: {
            bytecode: {
              id: $bytecodeId
            }
          }
        }
      }]
    }) {
      contracts {
        id
        name
        sourceContract {
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
          }
        }
      }
    }
  }
`;
