import gql from "graphql-tag";
import { generateId, Migrations, WorkspaceClient } from './utils';

describe ('Network', () => {
  const wsClient = new WorkspaceClient();
  const expectedHash = '0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa6';
  const expectedId = generateId({
    networkId: Object.keys(Migrations.networks)[0],
    historicBlock: {
      height: 1,
      hash: expectedHash
    }
  });

  const variables = {
    networkId: Object.keys(Migrations.networks)[0],
    height: 1,
    hash: expectedHash
  };

  let addNetworksResult;

  beforeEach(async () => {
    addNetworksResult = await wsClient.execute(AddNetworks,
      {
        networkId: variables.networkId,
        height: variables.height,
        hash: variables.hash
      }
    );
  });

  test('can be added', () => {
    expect(addNetworksResult).toHaveProperty("networksAdd");

    const { networksAdd } = addNetworksResult;
    expect(networksAdd).toHaveProperty("networks");

    const { networks } = networksAdd;
    expect(networks).toHaveLength(1);

    const network = networks[0];
    expect(network).toHaveProperty("id");

    const { id } = network;
    expect(id).toEqual(expectedId);
  });

  test('can be queried', async () => {
    const getNetworkResult = await wsClient.execute(GetNetwork, { id: expectedId });
    expect(getNetworkResult).toHaveProperty("network");

    const { network } = getNetworkResult;
    expect(network).toHaveProperty("id");
    expect(network).toHaveProperty("networkId");

    const { id, networkId } = network;
    expect(id).toEqual(expectedId);
    expect(networkId).toEqual(variables.networkId);
  });
});


export const GetNetwork = gql`
  query GetNetwork($id: ID!) {
    network(id: $id) {
      networkId
      id
    }
  }
`;

export const AddNetworks = gql`
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
  }
`;

