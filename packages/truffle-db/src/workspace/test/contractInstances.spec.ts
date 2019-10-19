import gql from "graphql-tag";
import { generateId, Migrations, WorkspaceClient } from './utils';

import { AddNetworks } from './network.spec';

describe("Contract Instance", () => {
  const wsClient = new WorkspaceClient();
  let variables;
  let expectedId;
  let addNetworkResult;

  beforeEach(async () => {
    const address = Object.values(Migrations.networks)[0]["address"];
    addNetworkResult = await wsClient.execute(AddNetworks, {
      networkId: Object.keys(Migrations.networks)[0],
      height: 1,
      hash: '0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa6'
    });

    expectedId = generateId({ address: address, network: { id: addNetworkResult.networksAdd.networks[0].id }});

    variables = [{
      address: address,
      network: {
        id: addNetworkResult.networksAdd.networks[0].id
      },
      contract: {
        id:  generateId({
          name: Migrations.contractName,
          abi: { json: JSON.stringify(Migrations.abi) } ,
          sourceContract: { index: 0 } ,
          compilation: { id:  '0x7f91bdeb02ae5fd772f829f41face7250ce9eada560e3e7fa7ed791c40d926bd' }
        })
      },
      creation: {
        transactionHash: Migrations.networks['5777'].transactionHash,
        constructor: {
          createBytecode: {
            id: generateId({ bytes: Migrations.bytecode })
          }
        }
      }
    }];
  });

  test("can be added", async () => {
    const addContractInstancesResult = await wsClient.execute(AddContractInstances, { contractInstances: variables });
    expect(addContractInstancesResult).toHaveProperty("contractInstancesAdd");

    const { contractInstancesAdd } = addContractInstancesResult;
    expect(contractInstancesAdd).toHaveProperty("contractInstances");

    const { contractInstances } = contractInstancesAdd;
    expect(contractInstances[0]).toHaveProperty("address");
    expect(contractInstances[0]).toHaveProperty("network");

    const { address, network } = contractInstances[0];
    expect(address).toEqual(Object.values(Migrations.networks)[0]["address"]);
    expect(network).toHaveProperty("networkId");

    const { networkId } = network;
    expect(networkId).toEqual(Object.keys(Migrations.networks)[0]);

  });

  test("can be queried", async() => {
    const getContractInstanceResult = await wsClient.execute(GetContractInstance, { id: expectedId });
    expect(getContractInstanceResult).toHaveProperty("contractInstance");

    const { contractInstance } = getContractInstanceResult;
    expect(contractInstance).toHaveProperty("address");
    expect(contractInstance).toHaveProperty("network");

    const { address, network } = contractInstance;
    expect(address).toEqual(Object.values(Migrations.networks)[0]["address"]);

    const { networkId } = network;
    expect(networkId).toEqual(addNetworkResult.networksAdd.networks[0].networkId);
  });
});

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
            bytes
          }
        }
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
  }
`;


