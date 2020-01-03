import gql from "graphql-tag";

export const AddContractInstances = gql`
  input ContractInstanceNetworkInput {
    id: ID!
  }

  input ContractInstanceContractInput {
    id: ID!
  }

  input ContractInstanceCreationConstructorBytecodeInput {
    id: ID!
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
    workspace {
      contractInstancesAdd(input: { contractInstances: $contractInstances }) {
        contractInstances {
          address
          network {
            name
            networkID
            historicBlock {
              height
              hash
            }
          }
          contract {
            name
          }
          creation {
            transactionHash
            constructor {
              createBytecode {
                bytes
              }
            }
          }
        }
      }
    }
  }
`;
