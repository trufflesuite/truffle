import debugModule from "debug";
const debug = debugModule("debugger:test:data:calldata");

import { assert } from "chai";

import Ganache from "ganache";

import { prepareContracts, lineOf, testBlockGasLimit } from "../helpers";
import Debugger from "lib/debugger";

import * as Codec from "@truffle/codec";

import sourcemapping from "lib/sourcemapping/selectors";

const __CALLDATA = `
pragma solidity ^0.8.0;

contract CalldataTest {

  event Done();

  struct Pair {
    uint x;
    uint y;
  }

  struct StringBox {
    string it;
  }

  function simpleTest(string calldata hello) external {
    emit Done(); //break simple
  }

  function staticTest(string calldata hello) external pure returns (string memory) {
    return hello; //break static
  }

  function staticTester() public {
    this.staticTest("hello world");
  }

  function delegateTester() public {
    CalldataLibrary.delegateTest("hello world");
  }

  function multiTest(
    string calldata hello,
    uint[] calldata someInts,
    Pair calldata pair)
  external {
    emit Done(); //break multi
  }

  function multiTester() public {
    uint[2] memory twoInts;
    uint[] memory someInts;
    someInts = new uint[](2);
    someInts[0] = 41;
    someInts[1] = 42;
    Pair memory pair;
    pair.x = 321;
    pair.y = 2049;
    this.multiTest("hello", someInts, pair);
  }

  function stringBoxTest(StringBox calldata stringBox) external returns (string memory) {
    return stringBox.it; //break stringBox
  }

  function sliceTest(uint[] calldata nums) external returns (uint[] memory) {
    uint[] calldata sliced = nums[1 : nums.length - 1];
    emit Done(); //break slice
  }

  fallback(bytes calldata input) external returns (bytes memory output) {
    output = input;
    emit Done(); //break fallback
  }

}

library CalldataLibrary {

  event Done();

  function delegateTest(string calldata hello) external {
    emit Done(); //break delegate
  }
}
`;

const __MIGRATION = `
var CalldataTest = artifacts.require("CalldataTest");
var CalldataLibrary = artifacts.require("CalldataLibrary");

module.exports = function(deployer) {
  deployer.deploy(CalldataLibrary);
  deployer.link(CalldataLibrary, CalldataTest);
  deployer.deploy(CalldataTest);
};
`;

let sources = {
  "CalldataTest.sol": __CALLDATA
};

let migrations = {
  "2_deploy_contracts.js": __MIGRATION
};

describe("Calldata Decoding", function () {
  let provider;
  let abstractions;
  let compilations;

  before("Create Provider", async function () {
    provider = Ganache.provider({
      seed: "debugger",
      logging: {
        quiet: true
      },
      miner: {
        instamine: "strict",
        blockGasLimit: testBlockGasLimit
      }
    });
  });

  before("Prepare contracts and artifacts", async function () {
    this.timeout(30000);

    let prepared = await prepareContracts(provider, sources, migrations);
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;
  });

  it("Decodes various types correctly", async function () {
    this.timeout(9000);
    let instance = await abstractions.CalldataTest.deployed();
    let receipt = await instance.multiTester();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let sourceId = bugger.view(sourcemapping.current.source).id;
    let source = bugger.view(sourcemapping.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("break multi", source)
    });

    await bugger.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );

    const expectedResult = {
      hello: "hello",
      someInts: [41, 42],
      pair: { x: 321, y: 2049 }
    };

    assert.deepInclude(variables, expectedResult);
  });

  it("Decodes correctly in the initial call", async function () {
    this.timeout(6000);
    let instance = await abstractions.CalldataTest.deployed();
    let receipt = await instance.simpleTest("hello world");
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let sourceId = bugger.view(sourcemapping.current.source).id;
    let source = bugger.view(sourcemapping.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("break simple", source)
    });

    await bugger.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );

    const expectedResult = {
      hello: "hello world"
    };

    assert.include(variables, expectedResult);
  });

  it("Decodes dynamic structs correctly", async function () {
    this.timeout(6000);
    let instance = await abstractions.CalldataTest.deployed();
    let receipt = await instance.stringBoxTest({ it: "hello world" });
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let sourceId = bugger.view(sourcemapping.current.source).id;
    let source = bugger.view(sourcemapping.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("break stringBox", source)
    });

    await bugger.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );

    const expectedResult = {
      stringBox: {
        it: "hello world"
      }
    };

    assert.deepInclude(variables, expectedResult);
  });

  it("Decodes correctly in a pure call", async function () {
    this.timeout(6000);
    let instance = await abstractions.CalldataTest.deployed();
    let receipt = await instance.staticTester();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    let sourceId = bugger.view(sourcemapping.current.source).id;
    let source = bugger.view(sourcemapping.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("break static", source)
    });

    await bugger.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );

    const expectedResult = {
      hello: "hello world"
    };

    assert.include(variables, expectedResult);
  });

  it("Decodes correctly in a library call", async function () {
    this.timeout(6000);
    let instance = await abstractions.CalldataTest.deployed();
    let receipt = await instance.delegateTester();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    let sourceId = bugger.view(sourcemapping.current.source).id;
    let source = bugger.view(sourcemapping.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("break delegate", source)
    });

    await bugger.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );

    const expectedResult = {
      hello: "hello world"
    };

    assert.include(variables, expectedResult);
  });

  it("Decodes array slices correctly", async function () {
    this.timeout(6000);
    let instance = await abstractions.CalldataTest.deployed();
    let receipt = await instance.sliceTest([20, 21, 22, 23, 24]);
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    let sourceId = bugger.view(sourcemapping.current.source).id;
    let source = bugger.view(sourcemapping.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("break slice", source)
    });

    await bugger.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );

    const expectedResult = {
      sliced: [21, 22, 23]
    };

    assert.deepInclude(variables, expectedResult);
  });

  it("Decodes fallback function input and output", async function () {
    this.timeout(6000);
    let instance = await abstractions.CalldataTest.deployed();
    let receipt = await instance.sendTransaction({ data: "0xdeadbeef" });
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    let sourceId = bugger.view(sourcemapping.current.source).id;
    let source = bugger.view(sourcemapping.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("break fallback", source)
    });

    await bugger.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );

    debug("variables: %O", variables);

    const expectedResult = {
      input: "0xdeadbeef",
      output: "0xdeadbeef"
    };

    assert.deepInclude(variables, expectedResult);

    await bugger.runToEnd();

    const decodings = await bugger.returnValue();

    assert.lengthOf(decodings, 1);
    const decoding = decodings[0];
    assert.equal(decoding.kind, "returnmessage");
    assert.equal(decoding.data, "0xdeadbeef");
  });
});
