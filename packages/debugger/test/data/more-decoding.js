import debugModule from "debug";
const debug = debugModule("debugger:test:data:more-decoding");

import { assert } from "chai";
import Web3 from "web3"; //just using for utils

import Ganache from "ganache";

import { prepareContracts, lineOf } from "../helpers";
import Debugger from "lib/debugger";

import solidity from "lib/solidity/selectors";
import data from "lib/data/selectors";
import evm from "lib/evm/selectors";

import * as Codec from "@truffle/codec";

const __CONTAINERS = `
pragma solidity ^0.8.0;

contract ContainersTest {

  //provides a nice ending point
  event Done();

  //declare needed structs
  struct Wrapper {
    uint x;
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
    uint[2] storage localStorage = pointedAt;

    //set up variables with values
    storageStructArray.push();
    storageStructArray[0].x = 107;

    storageArrayArray.push();
    storageArrayArray[0][0] = 2;
    storageArrayArray[0][1] = 3;

    structMapping["hello"].x = 107;

    arrayMapping["hello"][0] = 2;
    arrayMapping["hello"][1] = 3;

    signedMapping["hello"] = -1;

    memoryStaticArray[0] = 107;

    //for this one, let's mix how we access it
    localStorage[0] = 107;
    pointedAt[1] = 214;

    //everything's set up, time to decode!
    emit Done(); //break here
  }
}
`;

const __KEYSANDBYTES = `
pragma solidity ^0.8.8;

contract ElementaryTest {

  event Done(); //makes a useful breakpoint

  enum Ternary { Red, Green, Blue }

  type MyInt is int8;

  //storage variables to be tested
  mapping(bool => bool) boolMap;
  mapping(bytes1 => bytes1) byteMap;
  mapping(bytes => bytes) bytesMap;
  mapping(bytes4 => bytes4) selectorMap;
  mapping(uint => uint) uintMap;
  mapping(int => int) intMap;
  mapping(string => string) stringMap;
  mapping(address => address) addressMap;
  mapping(ElementaryTest => ElementaryTest) contractMap;
  mapping(Ternary => Ternary) enumMap;
  mapping(MyInt => MyInt) wrapMap;

  //constant state variables to try as mapping keys
  //(and for testing on their own)
  uint constant two = 2;
  string constant hello = "hello";
  bytes4 constant hexConst = 0xdeadbeef;
  bytes4 constant short = hex"ff";

  function run() public {
    //local variables to be tested
    bytes1 oneByte;
    bytes1[] memory severalBytes;

    //set up variables for testing
    oneByte = 0xff;
    severalBytes = new bytes1[](1);
    severalBytes[0] = 0xff;

    boolMap[true] = true;

    byteMap[0x01] = 0x01;

    bytesMap[hex"01"] = hex"01";

    uintMap[1] = 1;
    uintMap[two] = two;

    intMap[-1] = -1;

    addressMap[address(this)] = address(this);

    stringMap["0xdeadbeef"] = "0xdeadbeef";
    stringMap["12345"] = "12345";
    stringMap[hello] = hello;

    contractMap[this] = this;

    enumMap[Ternary.Blue] = Ternary.Blue;

    wrapMap[MyInt.wrap(-2)] = MyInt.wrap(-2);

    selectorMap[hexConst] = hexConst;
    selectorMap[short] = short;
    selectorMap[hex"f00f"] = hex"f00f";

    emit Done(); //break here
  }
}
`;

const __SPLICING = `
pragma solidity ^0.8.0;

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

const __INNERMAPS = `
pragma solidity ^0.8.0;

contract ComplexMappingTest {

  struct MappingStruct {
    mapping(string => string) map;
  }

  mapping(string => string)[1] mapArrayStatic;
  mapping(string => mapping(string => string)) mapMap;
  MappingStruct mapStruct0;
  MappingStruct mapStruct1;

  function run() public {

    mapArrayStatic[0]["a"] = "0a";

    mapMap["a"]["c"] = "ac";

    mapStruct0.map["a"] = "00a";
    mapStruct1.map["e"] = "10e";
  }
}
`;

const __OVERFLOW = `
pragma solidity ^0.8.0;

contract OverflowTest {

  event Unsigned(uint8);
  event Raw(bytes1);
  event Signed(int8);

  function unsignedTest() public {
    unchecked {
      uint8[1] memory memoryByte;
      uint8 byte1 = 255;
      uint8 byte2 = 255;
      uint8 sum = byte1 + byte2;
      emit Unsigned(sum); //BREAK UNSIGNED
    }
  }

  function rawTest() public {
    bytes1 full = 0xff;
    bytes1 right = full >> 1;
    emit Raw(right); //BREAK RAW
  }

  function signedTest() public {
    unchecked {
      int8 byte1 = -128;
      int8 byte2 = -128;
      int8 sum = byte1 + byte2;
      emit Signed(sum); //BREAK SIGNED
    }
  }
}
`;

const __BADBOOL = `
pragma solidity ^0.8.0;
pragma abicoder v1;

contract BadBoolTest {

  mapping(bool => uint) boolMap;

  function run(bool key) public {
    boolMap[key] = 1;
  }
}
`;

const __CIRCULAR = `
pragma solidity ^0.8.0;

contract CircularTest {

  struct Tree {
    uint x;
    Tree[] children;
  }

  event Done();

  function run() public {

    Tree memory circular;
    circular.x = 3;
    circular.children = new Tree[](1);
    circular.children[0] = circular;

    emit Done(); //BREAK HERE
  }
}
`;

const __GLOBALDECLS = `
pragma solidity ^0.8.0;

struct GlobalStruct {
  uint x;
  uint y;
}

enum GlobalEnum {
  No, Yes
}

contract GlobalDeclarationTest {

  GlobalStruct globalStruct;
  GlobalEnum globalEnum;

  function run() public {
    globalStruct.x = 2;
    globalStruct.y = 3;
    globalEnum = GlobalEnum.Yes;
  }
}
`;

let sources = {
  "ContainersTest.sol": __CONTAINERS,
  "ElementaryTest.sol": __KEYSANDBYTES,
  "SpliceTest.sol": __SPLICING,
  "ComplexMappingsTest.sol": __INNERMAPS,
  "OverflowTest.sol": __OVERFLOW,
  "BadBoolTest.sol": __BADBOOL,
  "Circular.sol": __CIRCULAR,
  "GlobalDeclarations.sol": __GLOBALDECLS
};

describe("Further Decoding", function () {
  var provider;

  var abstractions;
  var compilations;

  before("Create Provider", async function () {
    provider = Ganache.provider({
      seed: "debugger",
      gasLimit: 7000000,
      miner: {
        instamine: "strict"
      },
      logging: {
        quiet: true
      }
    });
  });

  before("Prepare contracts and artifacts", async function () {
    this.timeout(30000);

    let prepared = await prepareContracts(provider, sources);
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;
  });

  it("Decodes various reference types correctly", async function () {
    this.timeout(12000);

    let instance = await abstractions.ContainersTest.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let sourceId = bugger.view(solidity.current.source).id;
    let source = bugger.view(solidity.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("break here", source)
    });

    await bugger.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );

    const expectedResult = {
      memoryStaticArray: [107],
      localStorage: [107, 214],
      storageStructArray: [{ x: 107 }],
      storageArrayArray: [[2, 3]],
      structMapping: { hello: { x: 107 } },
      arrayMapping: { hello: [2, 3] },
      signedMapping: { hello: -1 },
      pointedAt: [107, 214]
    };

    assert.deepInclude(variables, expectedResult);
  });

  it("Decodes elementary types and mappings correctly", async function () {
    this.timeout(12000);

    let instance = await abstractions.ElementaryTest.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;
    let address = instance.address;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let sourceId = bugger.view(solidity.current.source).id;
    let source = bugger.view(solidity.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("break here", source)
    });

    await bugger.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );
    debug("variables %O", variables);

    const expectedResult = {
      boolMap: { true: true },
      byteMap: { "0x01": "0x01" },
      bytesMap: { "0x01": "0x01" },
      uintMap: { 1: 1, 2: 2 },
      intMap: { "-1": -1 },
      stringMap: { "0xdeadbeef": "0xdeadbeef", 12345: "12345", hello: "hello" },
      addressMap: { [address]: address },
      contractMap: { [address]: address },
      enumMap: { "ElementaryTest.Ternary.Blue": "ElementaryTest.Ternary.Blue" },
      wrapMap: { "-2": -2 },
      oneByte: "0xff",
      severalBytes: ["0xff"],
      two: 2,
      hexConst: "0xdeadbeef",
      short: "0xff000000",
      hello: "hello",
      selectorMap: {
        "0xdeadbeef": "0xdeadbeef",
        "0xff000000": "0xff000000",
        "0xf00f0000": "0xf00f0000"
      }
    };

    assert.deepInclude(variables, expectedResult);
  });

  it("Splices locations correctly", async function () {
    this.timeout(12000);

    let instance = await abstractions.SpliceTest.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let sourceId = bugger.view(solidity.current.source).id;
    let source = bugger.view(solidity.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("break here", source)
    });

    await bugger.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );

    const expectedResult = {
      map: { key1: "value1", key2: "value2" },
      pointedAt: "key2",
      arrayArray: [[82]],
      arrayStruct: { x: [82] },
      key1: "key1",
      key2: "key2",
      pointedAt: "key2"
    };

    assert.deepInclude(variables, expectedResult);
  });

  it("Decodes inner mappings correctly and keeps path info", async function () {
    this.timeout(12000);

    let instance = await abstractions.ComplexMappingTest.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    //we're only testing storage so run till end
    await bugger.runToEnd();

    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );

    const expectedResult = {
      mapArrayStatic: [{ a: "0a" }],
      mapMap: { a: { c: "ac" } },
      mapStruct0: {
        map: { a: "00a" }
      },
      mapStruct1: {
        map: { e: "10e" }
      }
    };

    debug("variables %O", variables);
    debug("expectedResult %O", expectedResult);

    assert.deepInclude(variables, expectedResult);

    //let's get the ID of the current contract to use as an index
    let contractId = bugger.view(evm.current.context).contractId;

    //get offsets of top-level variables for this contract
    //converting to numbers for convenience
    const startingOffsets = Object.values(
      bugger.view(data.current.allocations.state)[contractId].members
    ).map(({ pointer }) => pointer.range.from.slot.offset);

    const mappingKeys = bugger.view(data.views.mappingKeys);
    for (let slot of mappingKeys) {
      while (slot.path !== undefined) {
        slot = slot.path;
      }
      //check that each path in the mapping keys can be traced back to one of
      //the top-level variables
      assert.deepInclude(startingOffsets, slot.offset);
    }
  });

  it("Cleans badly-encoded booleans used as mapping keys", async function () {
    this.timeout(12000);

    let instance = await abstractions.BadBoolTest.deployed();
    let signature = "run(bool)";
    //manually set up the selector; 10 is for initial 0x + 8 more hex digits
    let selector = Web3.utils
      .soliditySha3({ type: "string", value: signature })
      .slice(0, 10);
    let argument =
      "0000000000000000000000000000000000000000000000000000000000000002";
    let receipt = await instance.sendTransaction({ data: selector + argument });
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    await bugger.runToEnd();

    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );
    debug("variables %O", variables);

    const expectedResult = {
      boolMap: { true: 1 }
    };

    assert.deepInclude(variables, expectedResult);
  });

  it("Handles globally-declared structs and enums", async function () {
    this.timeout(12000);

    let instance = await abstractions.GlobalDeclarationTest.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    await bugger.runToEnd();

    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );
    debug("variables %O", variables);

    const expectedResult = {
      globalStruct: { x: 2, y: 3 },
      globalEnum: "GlobalEnum.Yes"
    };

    assert.deepInclude(variables, expectedResult);
  });

  it("Decodes circular structures", async function () {
    this.timeout(12000);

    let instance = await abstractions.CircularTest.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let sourceId = bugger.view(solidity.current.source).id;
    let source = bugger.view(solidity.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("BREAK HERE", source)
    });

    await bugger.continueUntilBreakpoint();

    const circular = Codec.Format.Utils.Inspect.unsafeNativize(
      await bugger.variable("circular")
    );

    assert.strictEqual(circular.x, 3);
    assert.isArray(circular.children);
    assert.lengthOf(circular.children, 1);
    assert.strictEqual(circular.children[0], circular);
  });

  describe("Overflow", function () {
    it("Discards padding on unsigned integers", async function () {
      let instance = await abstractions.OverflowTest.deployed();
      let receipt = await instance.unsignedTest();
      let txHash = receipt.tx;

      let bugger = await Debugger.forTx(txHash, { provider, compilations });

      let sourceId = bugger.view(solidity.current.source).id;
      let source = bugger.view(solidity.current.source).source;
      await bugger.addBreakpoint({
        sourceId,
        line: lineOf("BREAK UNSIGNED", source)
      });

      await bugger.continueUntilBreakpoint();

      const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
        await bugger.variables()
      );
      debug("variables %O", variables);

      const expectedResult = {
        byte1: 255,
        byte2: 255,
        sum: 254
      };

      assert.include(variables, expectedResult);
    });

    it("Discards padding on signed integers", async function () {
      let instance = await abstractions.OverflowTest.deployed();
      let receipt = await instance.signedTest();
      let txHash = receipt.tx;

      let bugger = await Debugger.forTx(txHash, { provider, compilations });

      let sourceId = bugger.view(solidity.current.source).id;
      let source = bugger.view(solidity.current.source).source;
      await bugger.addBreakpoint({
        sourceId,
        line: lineOf("BREAK SIGNED", source)
      });

      await bugger.continueUntilBreakpoint();

      const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
        await bugger.variables()
      );
      debug("variables %O", variables);

      const expectedResult = {
        byte1: -128,
        byte2: -128,
        sum: 0
      };

      assert.include(variables, expectedResult);
    });

    it("Discards padding on static bytestrings", async function () {
      let instance = await abstractions.OverflowTest.deployed();
      let receipt = await instance.rawTest();
      let txHash = receipt.tx;

      let bugger = await Debugger.forTx(txHash, { provider, compilations });

      let sourceId = bugger.view(solidity.current.source).id;
      let source = bugger.view(solidity.current.source).source;
      await bugger.addBreakpoint({
        sourceId,
        line: lineOf("BREAK RAW", source)
      });

      await bugger.continueUntilBreakpoint();

      const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
        await bugger.variables()
      );
      debug("variables %O", variables);

      const expectedResult = {
        full: "0xff",
        right: "0x7f"
      };

      assert.include(variables, expectedResult);
    });
  });
});
