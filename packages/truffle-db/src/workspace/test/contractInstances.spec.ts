import { generateId, Migrations, WorkspaceClient } from './utils';
import { Query, Mutation } from './queries';

const { AddNetworks } = Mutation;

const { GetContractInstance } = Query;
const { AddContractInstances } = Mutation;


describe("Contract Instance", () => {
  const client = new WorkspaceClient();
  let variables;
  let expectedId;
  let networkAdded;

  beforeEach(async () => {
    const network = {
      netId: Object.keys(Migrations.networks)[0],
      historicBlock: {
        height: 1,
        hash: '0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa6'
      }
    };
    const address = Object.values(Migrations.networks)[0]["address"];
    networkAdded = await client.execute(AddNetworks, {
      networkId: Object.keys(Migrations.networks)[0],
      height: 1,
      hash: '0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa6'
    });

    expectedId = generateId({ address: address, network: { id: networkAdded.networksAdd.networks[0].id }});

    variables = [{
      address: address,
      network: {
        id: networkAdded.networksAdd.networks[0].id
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

  it("adds contract instance", async () => {
    //add network
    {
      const data = await client.execute(AddContractInstances, { contractInstances: variables });
      expect(data).toHaveProperty("contractInstancesAdd");

      const { contractInstancesAdd } = data;
      expect(contractInstancesAdd).toHaveProperty("contractInstances");

      const { contractInstances } = contractInstancesAdd;
      expect(contractInstances[0]).toHaveProperty("address");
      expect(contractInstances[0]).toHaveProperty("network");

      const { address, network } = contractInstances[0];
      expect(address).toEqual(Object.values(Migrations.networks)[0]["address"]);
      expect(network).toHaveProperty("networkId");

      const { networkId } = network;
      expect(networkId).toEqual(Object.keys(Migrations.networks)[0]);
    }

    // // ensure retrieved as matching
    {
      const data = await client.execute(GetContractInstance, { id: expectedId });
      expect(data).toHaveProperty("contractInstance");

      const { contractInstance } = data;
      expect(contractInstance).toHaveProperty("address");
      expect(contractInstance).toHaveProperty("network");

      const { address, network } = contractInstance;
      expect(address).toEqual(Object.values(Migrations.networks)[0]["address"]);

      const { networkId } = network;
      expect(networkId).toEqual(networkAdded.networksAdd.networks[0].networkId);
    }
  });
});
