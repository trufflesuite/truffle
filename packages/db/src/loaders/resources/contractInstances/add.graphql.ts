import gql from "graphql-tag";

export const AddContractInstances = gql`
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
