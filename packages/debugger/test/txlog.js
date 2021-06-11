import debugModule from "debug";
const debug = debugModule("debugger:test:txlog");

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts } from "./helpers";
import Debugger from "lib/debugger";
import * as Codec from "@truffle/codec";

import txlog from "lib/txlog/selectors";

const __TXLOG = `
//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VizTest {

  event Dummy();

  function testCall(uint x) public returns (uint y) {
    return called(x);
  }

  function called(uint x) public returns (uint y) {
    emit Dummy();
    return x + 1;
  }

  function testLibrary() public {
    VizLibrary.loudIncrement(1);
  }

  function testTransfer() public {
    payable(tx.origin).transfer(1);
  }

  fallback(bytes calldata input) external returns (bytes memory) {
    called(input.length);
    return hex"beefdead";
  }

  function testRevert() public {
    callReverter();
  }

  function callReverter() public {
    revert("Oops!");
  }

  constructor() payable {
  }
}

contract Secondary {

  event Dummy();

  uint immutable x = another();
  uint immutable w;

  constructor(uint y) {
    w = y;
  }

  function another() public returns (uint z) {
    emit Dummy();
    return 2;
  }

  function secret() public returns (uint) {
    return x + w; //just here so x & w are used
  }
}

library VizLibrary {
  event Noise();

  function loudIncrement(uint x) external returns (uint y) {
    emit Noise();
    return x + 1;
  }
}
`;

let sources = {
  "VizTest.sol": __TXLOG
};

const __MIGRATION = `
let VizTest = artifacts.require("VizTest");
let VizLibrary = artifacts.require("VizLibrary");

module.exports = function(deployer) {
  deployer.deploy(VizLibrary);
  deployer.link(VizLibrary, VizTest);
  deployer.deploy(VizTest, { value: 100 });
};
`;

let migrations = {
  "2_deploy_contracts.js": __MIGRATION
};

function byName(variables) {
  return Object.assign(
    {},
    ...variables.map(variable => ({
      [variable.name]: variable.value
    }))
  );
}

describe("Transaction log (visualizer)", function () {
  var provider;

  var abstractions;
  var compilations;

  before("Create Provider", async function () {
    provider = Ganache.provider({ seed: "debugger", gasLimit: 7000000 });
  });

  before("Prepare contracts and artifacts", async function () {
    this.timeout(30000);

    let prepared = await prepareContracts(provider, sources, migrations);
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;
  });

  it("Correctly logs a simple call", async function () {
    this.timeout(12000);
    let instance = await abstractions.VizTest.deployed();
    let receipt = await instance.testCall(108);
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    await bugger.continueUntilBreakpoint(); //run till end

    const root = bugger.view(txlog.views.transactionLog);
    assert.equal(root.type, "transaction");
    assert.lengthOf(root.actions, 1);
    let call = root.actions[0];
    assert.equal(call.type, "callexternal");
    assert.equal(call.kind, "function");
    assert.equal(call.address, instance.address);
    assert.equal(call.functionName, "testCall");
    assert.equal(call.contractName, "VizTest");
    assert.equal(call.returnKind, "return");
    debug("arguments: %O", call.arguments);
    let inputs = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      byName(call.arguments)
    );
    debug("nativized: %O", inputs);
    assert.deepEqual(inputs, {
      x: 108
    });
    let outputs = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      byName(call.returnValues)
    );
    assert.deepEqual(outputs, {
      y: 109
    });
    assert.lengthOf(call.actions, 1);
    call = call.actions[0];
    assert.equal(call.type, "callinternal");
    assert.equal(call.functionName, "called");
    assert.equal(call.contractName, "VizTest");
    assert.equal(call.returnKind, "return");
    inputs = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      byName(call.arguments)
    );
    assert.deepEqual(inputs, {
      x: 108
    });
    outputs = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      byName(call.returnValues)
    );
    assert.deepEqual(outputs, {
      y: 109
    });
  });

  it("Correctly logs a creation", async function () {
    this.timeout(12000);
    let instance = await abstractions.Secondary.new(108);
    let txHash = instance.transactionHash;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    await bugger.continueUntilBreakpoint(); //run till end

    const root = bugger.view(txlog.views.transactionLog);
    assert.equal(root.type, "transaction");
    assert.lengthOf(root.actions, 1);
    let call = root.actions[0];
    assert.equal(call.type, "callexternal");
    assert.equal(call.kind, "constructor");
    assert.equal(call.address, instance.address);
    assert.isUndefined(call.functionName);
    assert.equal(call.contractName, "Secondary");
    assert.equal(call.returnKind, "return");
    let inputs = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      byName(call.arguments)
    );
    assert.deepEqual(inputs, {
      y: 108
    });
    debug("immuts: %O", call.returnImmutables);
    let outputs = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      byName(call.returnImmutables)
    );
    assert.deepEqual(outputs, {
      x: 2,
      w: 108
    });
    assert.lengthOf(call.actions, 1);
    call = call.actions[0];
    assert.equal(call.type, "callinternal");
    assert.equal(call.functionName, "another");
    assert.equal(call.contractName, "Secondary");
    assert.equal(call.returnKind, "return");
    assert.lengthOf(call.arguments, 0);
    outputs = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      byName(call.returnValues)
    );
    assert.include(outputs, {
      z: 2
    });
  });

  it("Correctly logs a library call", async function () {
    this.timeout(12000);
    let instance = await abstractions.VizTest.deployed();
    let library = await abstractions.VizLibrary.deployed();
    let receipt = await instance.testLibrary();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    await bugger.continueUntilBreakpoint(); //run till end

    const root = bugger.view(txlog.views.transactionLog);
    assert.equal(root.type, "transaction");
    assert.lengthOf(root.actions, 1);
    let call = root.actions[0];
    assert.equal(call.type, "callexternal");
    assert.equal(call.kind, "function");
    assert.equal(call.address, instance.address);
    assert.equal(call.functionName, "testLibrary");
    assert.equal(call.contractName, "VizTest");
    assert.equal(call.returnKind, "return");
    assert.lengthOf(call.arguments, 0);
    assert.lengthOf(call.returnValues, 0);
    assert.lengthOf(call.actions, 1);
    call = call.actions[0];
    assert.equal(call.type, "callexternal");
    assert.equal(call.kind, "function");
    assert.equal(call.address, library.address);
    assert.isTrue(call.isDelegate);
    assert.equal(call.functionName, "loudIncrement");
    assert.equal(call.contractName, "VizLibrary");
    assert.equal(call.returnKind, "return");
    let inputs = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      byName(call.arguments)
    );
    assert.deepEqual(inputs, {
      x: 1
    });
    let outputs = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      byName(call.returnValues)
    );
    assert.deepEqual(outputs, {
      y: 2
    });
  });

  it("Correctly logs an ether transfer", async function () {
    this.timeout(12000);
    let instance = await abstractions.VizTest.deployed();
    let receipt = await instance.testTransfer();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    await bugger.continueUntilBreakpoint(); //run till end

    const root = bugger.view(txlog.views.transactionLog);
    assert.equal(root.type, "transaction");
    let origin = root.origin;
    assert.lengthOf(root.actions, 1);
    let call = root.actions[0];
    assert.equal(call.type, "callexternal");
    assert.equal(call.kind, "function");
    assert.equal(call.address, instance.address);
    assert.equal(call.functionName, "testTransfer");
    assert.equal(call.contractName, "VizTest");
    assert.equal(call.returnKind, "return");
    assert.lengthOf(call.arguments, 0);
    assert.lengthOf(call.returnValues, 0);
    assert.lengthOf(call.actions, 1);
    call = call.actions[0];
    assert.equal(call.type, "callexternal");
    assert.equal(call.kind, "message");
    assert.equal(call.address, origin);
    assert.equal(call.value.toNumber(), 1);
    assert.equal(call.returnKind, "return");
  });

  it("Correctly logs a fallback call", async function () {
    this.timeout(12000);
    let instance = await abstractions.VizTest.deployed();
    let receipt = await instance.sendTransaction({ data: "0xdeadbeef" });
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    await bugger.continueUntilBreakpoint(); //run till end

    const root = bugger.view(txlog.views.transactionLog);
    assert.equal(root.type, "transaction");
    assert.lengthOf(root.actions, 1);
    let call = root.actions[0];
    assert.equal(call.type, "callexternal");
    assert.equal(call.kind, "message");
    assert.equal(call.address, instance.address);
    assert.equal(call.contractName, "VizTest");
    assert.equal(call.data, "0xdeadbeef");
    assert.equal(call.returnKind, "return");
    assert.equal(call.returnData, "0xbeefdead");
    assert.lengthOf(call.actions, 1);
    call = call.actions[0];
    assert.equal(call.type, "callinternal");
    assert.equal(call.functionName, "called");
    assert.equal(call.contractName, "VizTest");
    assert.equal(call.returnKind, "return");
    let inputs = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      byName(call.arguments)
    );
    assert.deepEqual(inputs, {
      x: 4
    });
    let outputs = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      byName(call.returnValues)
    );
    assert.deepEqual(outputs, {
      y: 5
    });
  });

  it("Correctly logs a revert", async function () {
    this.timeout(12000);
    let instance = await abstractions.VizTest.deployed();
    //HACK: because this transaction fails, we have to extract the hash from
    //the resulting exception (there is supposed to be a non-hacky way but it
    //does not presently work)
    let txHash;
    try {
      await instance.testRevert(); //this will throw because of the revert
    } catch (error) {
      txHash = error.hashes[0]; //it's the only hash involved
    }

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    await bugger.continueUntilBreakpoint(); //run till end

    const root = bugger.view(txlog.views.transactionLog);
    assert.equal(root.type, "transaction");
    assert.lengthOf(root.actions, 1);
    let call = root.actions[0];
    assert.equal(call.type, "callexternal");
    assert.equal(call.kind, "function");
    assert.equal(call.address, instance.address);
    assert.equal(call.functionName, "testRevert");
    assert.equal(call.contractName, "VizTest");
    assert.equal(call.returnKind, "unwind");
    assert.lengthOf(call.arguments, 0);
    assert.lengthOf(call.actions, 1);
    call = call.actions[0];
    assert.equal(call.type, "callinternal");
    assert.equal(call.functionName, "callReverter");
    assert.equal(call.contractName, "VizTest");
    assert.equal(call.returnKind, "revert");
    assert.lengthOf(call.arguments, 0);
    assert.equal(call.error.kind, "revert");
    assert.lengthOf(call.error.arguments, 1);
    assert.equal(
      Codec.Format.Utils.Inspect.unsafeNativize(call.error.arguments[0].value),
      "Oops!"
    );
  });

  it("Resets properly", async function () {
    this.timeout(12000);
    let instance = await abstractions.VizTest.deployed();
    let receipt = await instance.testCall(108);
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    await bugger.continueUntilBreakpoint(); //run till end
    await bugger.reset();

    const root = bugger.view(txlog.views.transactionLog);
    assert.equal(root.type, "transaction");
    assert.isDefined(root.origin); //not going to bother checking specific address
    assert.lengthOf(root.actions, 1);
    let call = root.actions[0];
    assert.equal(call.type, "callexternal");
    assert.equal(call.kind, "function");
    assert.equal(call.address, instance.address);
    assert.equal(call.functionName, "testCall");
    assert.equal(call.contractName, "VizTest");
    assert.notProperty(call, "returnKind");
    let inputs = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      byName(call.arguments)
    );
    assert.deepEqual(inputs, {
      x: 108
    });
    assert.notProperty(call, "returnValues");
    assert.lengthOf(call.actions, 0);
    assert.isTrue(call.waitingForFunctionDefinition);
    assert.isTrue(call.absorbNextInternalCall);
  });
});
