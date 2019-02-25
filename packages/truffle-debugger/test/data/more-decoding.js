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
  struct Wrapper {
    uint x;
  }

  struct HasMap {
    uint x;
    mapping(string => string) map;
    uint y;
  }

  //declare storage variables to be tested
  Wrapper[] storageStructArray;
  uint128[2][] storageArrayArray;

  mapping(string => Wrapper) structMapping;
  mapping(string => uint128[2]) arrayMapping;

  mapping(string => int128) signedMapping;

  //this one is not tested directly
  uint[2] pointedAt;

  function run() public {

    //declare local variables to be tested
    uint[1] memory memoryStaticArray;
    HasMap memory memoryStructWithMap;
    uint[2] storage localStorage = pointedAt;

    //set up variables with values
    storageStructArray.length = 1;
    storageStructArray[0].x = 107;

    storageArrayArray.length = 1;
    storageArrayArray[0][0] = 2;
    storageArrayArray[0][1] = 3;

    structMapping["hello"].x = 107;

    arrayMapping["hello"][0] = 2;
    arrayMapping["hello"][1] = 3;

    signedMapping["hello"] = -1;

    memoryStaticArray[0] = 107;

    memoryStructWithMap.x = 107;
    memoryStructWithMap.y = 214;

    //for this one, let's mix how we access it
    localStorage[0] = 107;
    pointedAt[1] = 214;

    //everything's set up, time to decode!
    emit Done(); //break here
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

    bytesMap[hex"01"] = hex"01";

    uintMap[1] = 1;

    intMap[-1] = -1;

    addressMap[address(this)] = address(this);

    stringMap["0xdeadbeef"] = "0xdeadbeef";
    stringMap["12345"] = "12345";

    emit Done(); //break here
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

  struct ArrayStruct {
    uint[1] x;
  }

  string pointedAt = "key2";

  function run() public {
    uint[1][1] memory arrayArray;
    ArrayStruct memory arrayStruct;

    arrayArray[0][0] = 82;

    arrayStruct.x[0] = 82;

    string memory key1 = "key1";
    string storage key2 = pointedAt;

    map[key1] = "value1";
    map[key2] = "value2";

    emit Done(); //break here
  }
}
`;

let sources = {
  "ContainersTest.sol": __CONTAINERS,
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
      memoryStaticArray: [new BN(107)],
      memoryStructWithMap: { x: new BN(107), y: new BN(214) },
      localStorage: [new BN(107), new BN(214)],
      storageStructArray: [{ x: new BN(107) }],
      storageArrayArray: [[new BN(2), new BN(3)]],
      structMapping: new Map([["hello", { x: new BN(107) }]]),
      arrayMapping: new Map([["hello", [new BN(2), new BN(3)]]]),
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
    this.timeout(9000);

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
      byteMap: new Map([["0x01", "0x01"]]),
      bytesMap: new Map([["0x01", "0x01"]]),
      uintMap: new Map([[1, 1]]),
      intMap: new Map([[-1, -1]]),
      stringMap: new Map([["0xdeadbeef", "0xdeadbeef"], ["12345", "12345"]]),
      addressMap: new Map([[address, address]]),
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
      arrayArray: [[new BN(82)]],
      arrayStruct: { x: [new BN(82)] },
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
