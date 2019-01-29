import debugModule from "debug";
const debug = debugModule("test:data:more-decoding"); //eslint-disable-line no-unused-vars

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts } from "../helpers";
import Debugger from "lib/debugger";

import solidity from "lib/solidity/selectors";

import BN from "bn.js";

const __CONTAINERS = `
pragma solidity ^0.5.0;

contract ContainersTest {

  //provides a nice ending point
  event Done();

  //declare needed structs
  struct Pair {
    uint x;
    uint y;
  }

  struct HasMap {
    uint x;
    mapping(string => string) map;
    uint y;
  }

  //declare storage variables to be tested
  Pair[] storageStructArray;
  uint128[4][] storageArrayArray;

  mapping(string => Pair) structMapping;
  mapping(string => uint128[4]) arrayMapping;

  mapping(string => int128) signedMapping;

  //this one is not tested directly
  uint[2] pointedAt;

  function run() public {

    //declare local variables to be tested
    uint[2] memory memoryStaticArray;
    HasMap memory memoryStructWithMap;
    uint[2] storage localStorage = pointedAt;

    //set up variables with values
    storageStructArray.length = 1;
    storageStructArray[0].x = 107;
    storageStructArray[0].y = 214;

    storageArrayArray.length = 1;
    storageArrayArray[0][0] = 2;
    storageArrayArray[0][1] = 3;
    storageArrayArray[0][2] = 7;
    storageArrayArray[0][3] = 57;

    structMapping["hello"].x = 107;
    structMapping["hello"].y = 214;

    arrayMapping["hello"][0] = 2;
    arrayMapping["hello"][1] = 3;
    arrayMapping["hello"][2] = 7;
    arrayMapping["hello"][3] = 57;

    signedMapping["hello"] = -1;

    memoryStaticArray[0] = 107;
    memoryStaticArray[1] = 214;

    memoryStructWithMap.x = 107;
    memoryStructWithMap.y = 214;

    //for this one, let's mix how we access it
    localStorage[0] = 107;
    pointedAt[1] = 214;

    //everything's set up, time to decode!
    emit Done(); //break here (71)
  }
}
`;

let sources = {
  "ContainerTest.sol": __CONTAINERS
};

describe("Further Decoding", function() {
  var provider;

  var abstractions;
  var artifacts;
  var files;

  before("Create Provider", async function() {
    provider = Ganache.provider({ seed: "debugger", gasLimit: 7000000 });
  });

  before("Prepare contracts and artifacts", async function() {
    this.timeout(30000);

    let prepared = await prepareContracts(provider, sources);
    abstractions = prepared.abstractions;
    artifacts = prepared.artifacts;
    files = prepared.files;
  });

  it("Decodes various reference types correctly", async function() {
    this.timeout(4000);

    let instance = await abstractions.ContainersTest.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      files,
      contracts: artifacts
    });

    let session = bugger.connect();

    let sourceId = session.view(solidity.current.source).id;
    session.addBreakpoint({ sourceId, line: 71 });

    session.continueUntilBreakpoint();

    const variables = await session.variables();

    const expectedResult = {
      memoryStaticArray: [new BN(107), new BN(214)],
      memoryStructWithMap: { x: new BN(107), y: new BN(214) },
      localStorage: [new BN(107), new BN(214)],
      storageStructArray: [{ x: new BN(107), y: new BN(214) }],
      storageArrayArray: [[new BN(2), new BN(3), new BN(7), new BN(57)]],
      structMapping: new Map([["hello", { x: new BN(107), y: new BN(214) }]]),
      arrayMapping: new Map([
        ["hello", [new BN(2), new BN(3), new BN(7), new BN(57)]]
      ]),
      signedMapping: new Map([["hello", -new BN(1)]]),
      pointedAt: [new BN(107), new BN(214)]
    };

    assert.hasAllKeys(variables, expectedResult);

    for (let name in expectedResult) {
      if (expectedResult[name] instanceof Map) {
        //each map has "hello" as its only key
        assert.deepEqual(
          variables[name]["hello"],
          expectedResult[name]["hello"]
        );
      } else {
        assert.deepEqual(variables[name], expectedResult[name]);
      }
    }
  });
});
