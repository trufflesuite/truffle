import debugModule from "debug";
const debug = debugModule("test:data:more-decoding");

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts, lineOf } from "../helpers";
import Debugger from "lib/debugger";

import solidity from "lib/solidity/selectors";

import * as TruffleDecodeUtils from "truffle-decode-utils";

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

const __KEYSANDBYTES = `
pragma solidity ^0.5.0;

contract ElementaryTest {

  event Done(); //makes a useful breakpoint

  //storage variables to be tested
  mapping(bool => bool) boolMap;
  mapping(byte => byte) byteMap;
  mapping(bytes => bytes) bytesMap;
  mapping(uint => uint) uintMap;
  mapping(int => int) intMap;
  mapping(string => string) stringMap;
  mapping(address => address) addressMap;
  mapping(uint8 => uint8) uint8Map;

  function run() public {
    //local variables to be tested
    byte oneByte;
    byte[] memory severalBytes;

    //set up variables for testing
    oneByte = 0xff;
    severalBytes = new byte[](1);
    severalBytes[0] = 0xff;

    boolMap[true] = true;

    byteMap[0x01] = 0x01;
    byteMap[0xff] = 0xff;
    byteMap[byte(0x02)] = byte(0x02);

    bytesMap[hex"01"] = hex"01";
    bytesMap[hex"ff"] = hex"ff";

    uintMap[1] = 1;

    intMap[1] = 1;
    intMap[-1] = -1;

    uint8Map[uint8(byte(0x01))] = uint8(byte(0x01));
    uint8Map[uint8(int8(2))] = uint8(int8(2));

    addressMap[0x0000000000000000000000000000000000000001] =
      0x0000000000000000000000000000000000000001;
    addressMap[address(this)] = address(this);

    stringMap["innocuous string"] = "innocuous string";
    stringMap["0xdeadbeef"] = "0xdeadbeef";
    stringMap["12345"] = "12345";

    emit Done(); //break here (52)
  }
}
`;

const __SPLICING = `
pragma solidity ^0.5.0;

contract SpliceTest {
  //splicing is (nontrivially) used in two contexts right now:
  //1. decoding nested memory structures
  //2. decoding mapping keys pointed to by a memory variable
  //we'll also test some trivial splicing, I guess

  event Done();

  mapping(string => string) map;

  struct ArrayPair {
    uint[2] x;
    uint[2] y;
  }

  string pointedAt = "key2";

  function run() public {
    uint[2][2] memory arrayArray;
    ArrayPair memory arrayStruct;

    arrayArray[0][0] = 1;
    arrayArray[0][1] = 2;
    arrayArray[1][0] = 3;
    arrayArray[1][1] = 4;

    arrayStruct.x[0] = 1;
    arrayStruct.x[1] = 2;
    arrayStruct.y[0] = 3;
    arrayStruct.y[1] = 4;

    string memory key1 = "key1";
    string storage key2 = pointedAt;

    map[key1] = "value1";
    map[key2] = "value2";

    emit Done(); //break here (40)
  }
}
`;

let sources = {
  "ContainerTest.sol": __CONTAINERS,
  "ElementaryTest.sol": __KEYSANDBYTES,
  "SpliceTest.sol": __SPLICING
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
    this.timeout(9000);

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
    let source = session.view(solidity.current.source).source;
    session.addBreakpoint({ sourceId, line: lineOf("break here", source) });

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
      signedMapping: new Map([["hello", new BN(-1)]]),
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

  it("Decodes elementary types and mappings correctly", async function() {
    this.timeout(10000);

    let instance = await abstractions.ElementaryTest.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;
    let address = instance.address;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      files,
      contracts: artifacts
    });

    let session = bugger.connect();

    let sourceId = session.view(solidity.current.source).id;
    let source = session.view(solidity.current.source).source;
    session.addBreakpoint({ sourceId, line: lineOf("break here", source) });

    session.continueUntilBreakpoint();

    const variables = TruffleDecodeUtils.Conversion.cleanBNs(
      await session.variables()
    ); //get rid of BNs to avoid Map problems
    debug("variables %O", variables);

    const expectedResult = {
      boolMap: new Map([[true, true]]),
      byteMap: new Map([["0x01", "0x01"], ["0x02", "0x02"], ["0xff", "0xff"]]),
      bytesMap: new Map([["0x01", "0x01"], ["0xff", "0xff"]]),
      uintMap: new Map([[1, 1]]),
      intMap: new Map([[1, 1], [-1, -1]]),
      stringMap: new Map([
        ["innocuous string", "innocuous string"],
        ["0xdeadbeef", "0xdeadbeef"],
        ["12345", "12345"]
      ]),
      addressMap: new Map([
        [
          "0x0000000000000000000000000000000000000001",
          "0x0000000000000000000000000000000000000001"
        ],
        [address, address]
      ]),
      uint8Map: new Map([[1, 1], [2, 2]]),
      oneByte: "0xff",
      severalBytes: ["0xff"]
    };

    assert.hasAllKeys(variables, expectedResult);

    for (let name in expectedResult) {
      if (expectedResult[name] instanceof Map) {
        assert.sameDeepMembers(
          Array.from(variables[name].keys()),
          Array.from(expectedResult[name].keys())
        );
        for (let key of expectedResult[name].keys()) {
          //no mappings are nested so this will do fine
          assert.deepEqual(variables[name][key], expectedResult[name][key]);
        }
      } else {
        assert.deepEqual(variables[name], expectedResult[name]);
      }
    }
  });

  it("Splices locations correctly", async function() {
    this.timeout(9000);

    let instance = await abstractions.SpliceTest.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      files,
      contracts: artifacts
    });

    let session = bugger.connect();

    let sourceId = session.view(solidity.current.source).id;
    let source = session.view(solidity.current.source).source;
    session.addBreakpoint({ sourceId, line: lineOf("break here", source) });

    session.continueUntilBreakpoint();

    const variables = await session.variables();

    const expectedResult = {
      map: new Map([["key1", "value1"], ["key2", "value2"]]),
      pointedAt: "key2",
      arrayArray: [[new BN(1), new BN(2)], [new BN(3), new BN(4)]],
      arrayStruct: { x: [new BN(1), new BN(2)], y: [new BN(3), new BN(4)] },
      key1: "key1",
      key2: "key2",
      pointedAt: "key2"
    };

    assert.hasAllKeys(variables, expectedResult);

    for (let name in expectedResult) {
      if (expectedResult[name] instanceof Map) {
        assert.sameDeepMembers(
          Array.from(variables[name].keys()),
          Array.from(expectedResult[name].keys())
        );
        for (let key of expectedResult[name].keys()) {
          //no mappings are nested so this will do fine
          assert.deepEqual(variables[name][key], expectedResult[name][key]);
        }
      } else {
        assert.deepEqual(variables[name], expectedResult[name]);
      }
    }
  });
});
