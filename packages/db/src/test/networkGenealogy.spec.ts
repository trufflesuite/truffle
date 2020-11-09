import {generateId, WorkspaceClient} from "./utils";
import {
  FindAncestors,
  FindDescendants,
  AddNetworkGenealogies
} from "./networkGenealogy.graphql";
import {AddNetworks} from "./network.graphql";

// returnBlockHeader mocks the bare-bones return of a call to web3,
// to check whether a network resource is a part of the network we're connected to
const returnBlockHeader = blockNumber => {
  const blockHeaders = {
    1: {
      number: 1,
      hash: "0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa6"
    },
    2: {
      number: 2,
      hash: "0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa9"
    },
    3: {
      number: 3,
      hash: "0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa1"
    },
    4: {
      number: 4,
      hash: "0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa2"
    },
    5: {
      number: 5,
      hash: "0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa3"
    }
  };

  return blockHeaders[blockNumber];
};

describe("Network Genealogy", () => {
  let wsClient;
  let loneNetworkResult,
    secondAncestorNetworkResult,
    firstDescendantNetworkResult,
    mainNetworkResourceResult;
  let genealogyCheck;
  let ancestors, descendants, addNetworkGenealogyRecord;

  beforeAll(async () => {
    wsClient = new WorkspaceClient();

    // in reality this function would need some more looping through if there are more than
    // 5 results but that logic can be handled in the loader tests
    genealogyCheck = async (
      id: string,
      alreadyTried: [string],
      type: string,
      limit?: number
    ) => {
      let result;
      let possibleMatches;

      const queryLimit = limit ? limit : 5;
      if (type === "ancestor") {
        result = await wsClient.execute(FindAncestors, {
          id: id,
          alreadyTried: alreadyTried,
          limit: queryLimit
        });
        possibleMatches = result.network.possibleAncestors;
      } else if (type === "descendant") {
        result = await wsClient.execute(FindDescendants, {
          id: id,
          alreadyTried: alreadyTried,
          limit: queryLimit
        });
        possibleMatches = result.network.possibleDescendants;
      }

      let matches = [];
      // spoofing the logic that will be happening in  the loaders to check whether
      // there's a match to make this a possible match
      for (const match of possibleMatches) {
        let header = returnBlockHeader(match.network.historicBlock.height);
        if (header.hash === match.network.historicBlock.hash) {
          matches.push(match);
        }
      }

      return matches;
    };

    //add networks to test with
    loneNetworkResult = await wsClient.execute(AddNetworks, {
      name: "ganache",
      networkId: "5777",
      height: 1,
      hash: "0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa8"
    });

    await wsClient.execute(AddNetworks, {
      name: "ganache",
      networkId: "5778",
      height: 1,
      hash: "0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa6"
    });

    secondAncestorNetworkResult = await wsClient.execute(AddNetworks, {
      name: "ganache",
      networkId: "5778",
      height: 2,
      hash: "0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa9"
    });

    // this is the main network we're testing with. It has two ancestors and two decendants
    mainNetworkResourceResult = await wsClient.execute(AddNetworks, {
      name: "ganache",
      networkId: "5778",
      height: 3,
      hash: "0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa1"
    });

    firstDescendantNetworkResult = await wsClient.execute(AddNetworks, {
      name: "ganache",
      networkId: "5778",
      height: 4,
      hash: "0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa2"
    });

    await wsClient.execute(AddNetworks, {
      name: "ganache",
      networkId: "5778",
      height: 5,
      hash: "0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa3"
    });

    // check for ancestors using main network
    ancestors = await genealogyCheck(
      mainNetworkResourceResult.networksAdd.networks[0].id,
      [],
      "ancestor"
    );

    // check for descendants using main network
    descendants = await genealogyCheck(
      mainNetworkResourceResult.networksAdd.networks[0].id,
      [],
      "descendant"
    );

    // add networkGenealogy record using ancestor and descendant results
    addNetworkGenealogyRecord = await wsClient.execute(AddNetworkGenealogies, {
      ancestor: ancestors[0].network.id,
      descendant: descendants[0].network.id
    });
  });

  test("can query for ancestors", async () => {
    //two possible ancestors on the same network
    expect(ancestors).toHaveLength(2);
    //sorted by block height, descending
    expect(ancestors[0].network.historicBlock.height).toBeGreaterThan(
      ancestors[1].network.historicBlock.height
    );
    //since this is all our responses and they are sorted in descending order, the first one is the ancestor
    let {
      network: {
        id,
        historicBlock: {hash, height},
        networkId
      }
    } = ancestors[0];

    expect(id).toEqual(secondAncestorNetworkResult.networksAdd.networks[0].id);
    expect(hash).toEqual(
      secondAncestorNetworkResult.networksAdd.networks[0].historicBlock.hash
    );
    expect(height).toEqual(
      secondAncestorNetworkResult.networksAdd.networks[0].historicBlock.height
    );
    expect(height).toBeGreaterThan(ancestors[1].network.historicBlock.height);
    expect(networkId).toEqual(
      secondAncestorNetworkResult.networksAdd.networks[0].networkId
    );
  });

  test("can query for descendants", async () => {
    // two possible descendants on the same network
    expect(descendants).toHaveLength(2);
    //since this is all our responses and they are sorted in ascending order, the first one is the descendent
    let {
      network: {
        id,
        historicBlock: {hash, height},
        networkId
      }
    } = descendants[0];

    // matches the id of the network that should have been found
    expect(id).toEqual(firstDescendantNetworkResult.networksAdd.networks[0].id);
    expect(hash).toEqual(
      firstDescendantNetworkResult.networksAdd.networks[0].historicBlock.hash
    );
    expect(height).toEqual(
      firstDescendantNetworkResult.networksAdd.networks[0].historicBlock.height
    );
    expect(height).toBeLessThan(descendants[1].network.historicBlock.height);
    expect(networkId).toEqual(
      firstDescendantNetworkResult.networksAdd.networks[0].networkId
    );
  });

  test("can be added", async () => {
    //add a networkGenealogy record!
    expect(addNetworkGenealogyRecord).toHaveProperty("networkGenealogiesAdd");
    expect(addNetworkGenealogyRecord.networkGenealogiesAdd).toHaveProperty(
      "networkGenealogies"
    );
    expect(
      addNetworkGenealogyRecord.networkGenealogiesAdd.networkGenealogies.length
    ).toEqual(1);

    const networkGenealogyRecordId = generateId({
      ancestor: {id: ancestors[0].network.id},
      descendant: {id: descendants[0].network.id}
    });

    let {
      id,
      ancestor: {id: ancestorId},
      descendant: {id: descendantId}
    } = addNetworkGenealogyRecord.networkGenealogiesAdd.networkGenealogies[0];
    expect(id).toEqual(networkGenealogyRecordId);
    expect(ancestorId).toEqual(ancestors[0].network.id);
    expect(descendantId).toEqual(descendants[0].network.id);
  });

  test("respects limit on ancestor query", async () => {
    let ancestorsWithLimit = await genealogyCheck(
      mainNetworkResourceResult.networksAdd.networks[0].id,
      [],
      "ancestor",
      1
    );
    expect(ancestorsWithLimit.length).toEqual(1);
  });

  test("respects limit on descendant query", async () => {
    let descendantsWithLimit = await genealogyCheck(
      mainNetworkResourceResult.networksAdd.networks[0].id,
      [],
      "descendant",
      1
    );
    expect(descendantsWithLimit.length).toEqual(1);
  });

  test("accepts and respects alreadyTried array", async () => {
    const ancestorAlreadyTried = ancestors[1].network.id;
    let ancestorsWithAlreadyTried = await genealogyCheck(
      mainNetworkResourceResult.networksAdd.networks[0].id,
      [ancestorAlreadyTried],
      "ancestor"
    );

    expect(ancestorsWithAlreadyTried.length).toEqual(1);
  });

  test("returns empty array when no network candidates are an ancestor or descendant", async () => {
    const ancestor = await genealogyCheck(
      loneNetworkResult.networksAdd.networks[0].id,
      [],
      "ancestor"
    );

    expect(ancestor).toEqual([]);

    const descendant = await genealogyCheck(
      loneNetworkResult.networksAdd.networks[0].id,
      [],
      "descendant"
    );

    expect(descendant).toEqual([]);
  });
});
