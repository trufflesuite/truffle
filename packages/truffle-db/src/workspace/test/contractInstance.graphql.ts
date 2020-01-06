import gql from "graphql-tag";

export const GetContractInstance = gql`
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

export const GetAllContractInstances = gql`
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

export const AddContractInstances = gql`
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
