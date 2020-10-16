import gql from "graphql-tag";

export const AddContractInstances = gql`
  input ContractInstanceCreationConstructorLinkedBytecodeInput {
    bytecode: ResourceReferenceInput!
    linkValues: [LinkValueInput]
  }

  input ContractInstanceCallBytecodeInput {
    id: ID!
  }

  input ContractInstanceLinkedCallBytecodeInput {
    bytecode: ContractInstanceBytecodeInput
    linkValues: [LinkValueInput]
  }

  input ContractInstanceCreationConstructorInput {
    createBytecode: ContractInstanceCreationConstructorLinkedBytecodeInput!
  }

  input ContractInstanceCreationInput {
    transactionHash: TransactionHash!
    constructor: ContractInstanceCreationConstructorInput!
  }

  input ContractInstanceInput {
    address: Address!
    network: ResourceReferenceInput!
    creation: ContractInstanceCreationInput
    contract: ResourceReferenceInput
    callBytecode: ContractInstanceLinkedCallBytecodeInput
  }

  mutation AddContractInstances($contractInstances: [ContractInstanceInput!]!) {
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
              bytecode {
                bytes
                linkReferences {
                  offsets
                  name
                  length
                }
              }
              linkValues {
                value
                linkReference {
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
