import gql from "graphql-tag";

export const Query = {
  GetContractNames: gql`
    query GetContractNames {
    contractNames
  }`,

  GetSource: gql`
    query GetSource($id: ID!) {
      source(id: $id) {
        id
        contents
        sourcePath
      }
  }`,

  GetBytecode: gql`
    query GetBytecode($id: ID!) {
      bytecode(id: $id) {
        id
        bytes
      }
    }`,

  GetCompilation: gql`
    query GetCompilation($id: ID!) {
      compilation(id: $id) {
        id
        compiler {
          name
          version
        }
        sources {
          id
          contents
        }
        contracts {
          source {
            contents
          }
        }
      }
    }`,

  GetContract: gql`
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
  }`,

  GetNetwork: gql`
    query GetNetwork($id: ID!) {
      network(id: $id) {
        networkId
        id
      }
  }`,

  GetContractInstance: gql`
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
              bytes
            }
          }
        }
      }
  }`

};


export const Mutation = {
  AddSource: gql`
    mutation AddSource($contents: String!, $sourcePath: String) {
      sourcesAdd(input: {
        sources: [
           {
             contents: $contents,
             sourcePath: $sourcePath,
           }
        ]
      }) {
        sources {
          id
        }
      }
  }`,

  AddBytecode: gql`
    mutation AddBytecode($bytes: Bytes!) {
      bytecodesAdd(input: {
        bytecodes: [{
          bytes: $bytes
        }]
      }) {
        bytecodes {
          id
        }
      }
    }`,

  AddCompilation: gql`
    mutation AddCompilation($compilerName: String!, $compilerVersion: String!, $sourceId: ID!, $abi:String!) {
      compilationsAdd(input: {
        compilations: [{
          compiler: {
            name: $compilerName
            version: $compilerVersion
          }
          contracts: [
          {
            name:"testing",
            ast: {
              json: $abi
            }
            source: {
              id: $sourceId
            }
          }]
          sources: [
            {
             id: $sourceId
            }
          ]
        }]
      }) {
        compilations {
          id
          compiler {
            name
          }
          sources {
            contents
          }
          contracts {
            source {
              contents
              sourcePath
            }
            ast {
              json
            }
            name
          }
        }
      }
  }`,

  AddContracts: gql`
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
              id: $bytecodeId
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
              bytes
            }
          }
        }
      }
  }`,

  AddNetworks: gql`
    mutation AddNetworks($networkId: NetworkId!, $height: Int!, $hash: String!) {
      networksAdd(input: {
        networks: [{
          networkId: $networkId
          historicBlock: {
            height: $height
            hash: $hash
          }
        }]
      }) {
        networks {
          networkId
          id
        }
      }
    }`,

  AddContractInstances: gql`
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
      contractInstancesAdd(input: {
        contractInstances: $contractInstances
      }) {
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
                bytes
              }
            }
          }
        }
      }
  }`

};
