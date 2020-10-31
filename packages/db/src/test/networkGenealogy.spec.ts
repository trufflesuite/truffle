import { generateId, WorkspaceClient } from "./utils";
import {
  FindAncestors,
  FindDescendants,
  AddNetworkGenealogies
} from "./networkGenealogy.graphql";
import { AddNetworks } from "./network.graphql";
import { IdObject } from "@truffle/db/meta";

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
    firstAncestorNetworkResult,
    secondAncestorNetworkResult,
    firstDescendantNetworkResult,
    secondDescendantNetworkResult,
    mainNetworkResourceResult;
  let genealogyCheck;

  beforeAll(async () => {
    wsClient = new WorkspaceClient();

    // in reality this function would need some more looping through if there are more than 5 results. but we probably don't need to do that in the tests?
    genealogyCheck = async (
      id: string,
      alreadyTried: [IdObject],
      type: string
    ) => {
      let result;
      let possibleMatches;
      if (type === "ancestor") {
        result = await wsClient.execute(FindAncestors, {
          id: id,
          alreadyTried: alreadyTried
        });
        possibleMatches = result.network.possibleAncestors;
      } else if (type === "descendant") {
        result = await wsClient.execute(FindDescendants, {
          id: id,
          alreadyTried: alreadyTried
        });
        possibleMatches = result.network.possibleDescendants;
      }

      let matches = [];
      for (const match of possibleMatches) {
        let header = returnBlockHeader(match.network.historicBlock.height);
        if (header.hash === match.network.historicBlock.hash) {
          matches.push(match);
        }
      }

      return matches;
    };

    loneNetworkResult = await wsClient.execute(AddNetworks, {
      name: "ganache",
      networkId: "5777",
      height: 1,
      hash: "0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa8"
    });

    firstAncestorNetworkResult = await wsClient.execute(AddNetworks, {
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

    secondDescendantNetworkResult = await wsClient.execute(AddNetworks, {
      name: "ganache",
      networkId: "5778",
      height: 5,
      hash: "0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa3"
    });
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

  test("can add NetworkGenealogy when an ancestor and a descendant exist", async () => {
    let ancestors = await genealogyCheck(
      mainNetworkResourceResult.networksAdd.networks[0].id,
      [],
      "ancestor"
    );

    //two possible ancestors on the same network
    expect(ancestors).toHaveLength(2);
    //sorted by block height, descending
    expect(ancestors[0].network.historicBlock.height).toBeGreaterThan(
      ancestors[1].network.historicBlock.height
    );
    //since this is all our responses and they are sorted in descending order, the first one is the ancestor
    const ancestorFound = ancestors[0];
    console.debug("ancestor found id " + ancestorFound.network.id);
    expect(ancestorFound.network.id).toEqual(
      secondAncestorNetworkResult.networksAdd.networks[0].id
    );

    let descendants = await genealogyCheck(
      mainNetworkResourceResult.networksAdd.networks[0].id,
      [],
      "descendant"
    );
    // two possible descendants on the same network
    expect(descendants).toHaveLength(2);
    //sorted by block height, ascending
    expect(descendants[1].network.historicBlock.height).toBeGreaterThan(
      descendants[0].network.historicBlock.height
    );
    //since this is all our responses and they are sorted in ascending order, the first one is the descendent
    const descendantFound = descendants[0];

    //add a networkGenealogy record!
    let addedNetworkGenealogyRecord = await wsClient.execute(
      AddNetworkGenealogies,
      {
        ancestor: ancestorFound.network.id,
        descendant: descendantFound.network.id
      }
    );

    expect(addedNetworkGenealogyRecord).toHaveProperty("networkGenealogiesAdd");

    // expect(addedNetworkGenealogyRecord.)
    const networkGenealogyRecordId = generateId({
      ancestor: { id: ancestorFound.network.id },
      descendant: { id: descendantFound.network.id }
    });

    expect(networkGenealogyRecordId).toEqual(
      addedNetworkGenealogyRecord.networkGenealogiesAdd.networkGenealogies[0].id
    );
  });

  test("can add NetworkGenealogy when network is a descendant", async () => {});

  test("can add NetworkGenealogy when network is an ancestor", async () => {});

  test("when more potential ancestors than the limit exist, alreadyTried array ensures all that are necessary get tested", async () => {});

  test("when more potential descendants than the limit exist, alreadyTried array ensures all that are necessary get tested", async () => {});
});
