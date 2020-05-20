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

  input LinkReferenceInput {
    offsets: [Int]
    name: String
    length: Int
  }

  input LinkValueLinkReferenceInput {
    bytecode: ID!
    index: FileIndex
  }

  input LinkValueInput {
    value: Address!
    linkReference: LinkValueLinkReferenceInput!
  }

  input ContractInstanceCreationConstructorLinkedBytecodeInput {
    bytecode: ContractInstanceCreationConstructorBytecodeInput!
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
    network: ContractInstanceNetworkInput!
    creation: ContractInstanceCreationInput
    contract: ContractInstanceContractInput
    callBytecode: ContractInstanceLinkedCallBytecodeInput
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
  }
`;
