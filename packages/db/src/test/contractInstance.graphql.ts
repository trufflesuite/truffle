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
