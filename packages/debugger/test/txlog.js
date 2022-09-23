import debugModule from "debug";
const debug = debugModule("debugger:test:txlog");

import { assert } from "chai";

import Ganache from "ganache";

import {
  prepareContracts,
  testBlockGasLimit,
  testDefaultTxGasLimit
} from "./helpers";
import Debugger from "lib/debugger";
import * as Codec from "@truffle/codec";
import Web3 from "web3";

import txlog from "lib/txlog/selectors";
import trace from "lib/trace/selectors";

const __TXLOG = `
//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface Nothing {
  event Bloop();
}

contract VizTest is Nothing {

  event Dummy();

  event TakesArgs(uint indexed x, uint y);
  event Confusing(uint a, bytes32 indexed b, uint c);

  Tertiary tert;

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

  function testEvent() public {
    emit TakesArgs(1, 2);
    emit Bloop();
  }

  function testConfusing() public {
    emit Confusing(1, hex"deadbeef", 3);
    VizLibrary.confuse();
  }

  constructor(Tertiary _tert) payable {
    tert = _tert;
  }

  function testFlatEvents() public {
    testCall(1);
    try tert.noisyFail() {
    } catch (bytes memory) {
    }
    testCall(1);
  }
}

contract Secondary {

  event Dummy();
  event Set(uint);

  uint immutable x = another();
  uint immutable w;

  constructor(uint y) {
    w = y;
    emit Set(y);
  }

  function another() public returns (uint z) {
    emit Dummy();
    return 2;
  }

  function secret() public returns (uint) {
    return x + w; //just here so x & w are used
  }
}

contract Tertiary {

  event Tert();

  function noisyFail() public {
    emit Tert();
    VizLibrary.loudIncrement(1);
    revert();
  }
}

library VizLibrary {
  event Noise();
  event Confusing(uint x, bytes32 y, uint indexed z);

  function loudIncrement(uint x) external returns (uint y) {
    emit Noise();
    return x + 1;
  }

  function confuse() internal {
    emit Confusing(4, hex"deadf00f", 6);
  }
}
`;

let sources = {
  "VizTest.sol": __TXLOG
};

const __MIGRATION = `
const VizTest = artifacts.require("VizTest");
const VizLibrary = artifacts.require("VizLibrary");
const Tertiary = artifacts.require("Tertiary");

module.exports = async function(deployer) {
  await deployer.deploy(VizLibrary);
  await deployer.link(VizLibrary, Tertiary);
  await deployer.deploy(Tertiary);
  const tert = await Tertiary.deployed();
  await deployer.link(VizLibrary, VizTest);
  await deployer.deploy(VizTest, tert.address, { value: 100 });
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

function verifyNoIntermediates(untied) {
  for (const node of Object.values(untied)) {
    assert.notProperty(node, "waitingForFunctionDefinition"); //should be deleted by finish
    assert.notProperty(node, "absorbNextInternalCall"); //should be deleted by finish
    if (node.type === "callexternal") {
      assert.notEqual(node.kind, "library"); //should be changed to something else by finish
    }
  }
}

describe("Transaction log (visualizer)", function () {
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

  it("Correctly logs a simple call", async function () {
    this.timeout(12000);
    let instance = await abstractions.VizTest.deployed();
    let receipt = await instance.testCall(108);
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    await bugger.runToEnd();

    const untied = bugger.view(txlog.proc.transactionLog);
    verifyNoIntermediates(untied);

    const root = bugger.view(txlog.views.transactionLog);
    const steps = bugger.view(trace.steps).length;
    assert.equal(root.type, "transaction");
    assert.lengthOf(root.actions, 1);
    let call = root.actions[0];
    assert.equal(call.type, "callexternal");
    assert.equal(call.kind, "function");
    assert.equal(call.address, instance.address);
    assert.equal(call.functionName, "testCall");
    assert.equal(call.contractName, "VizTest");
    assert.equal(call.returnKind, "return");
    assert.equal(call.beginStep, -1); //initial call considered to begin on step -1
    assert.equal(call.endStep, steps - 1);
    const expectedSelector = Web3.utils
      .soliditySha3("testCall(uint256)")
      .slice(0, 2 + 2 * Codec.Evm.Utils.SELECTOR_SIZE);
    const expectedArgument = Codec.Conversion.toHexString(
      108,
      Codec.Evm.Utils.WORD_SIZE
    ).slice(2);
    assert.equal(call.raw.calldata, expectedSelector + expectedArgument);
    assert.notProperty(call.raw, "binary");
    debug("arguments: %O", call.arguments);
    let inputs = Codec.Export.unsafeNativizeVariables(byName(call.arguments));
    debug("nativized: %O", inputs);
    assert.deepEqual(inputs, {
      x: 108
    });
    let outputs = Codec.Export.unsafeNativizeVariables(
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
    assert.isAbove(
      call.endStep,
      call.beginStep,
      "beginStep should precede endStep for non-instant calls"
    );
    inputs = Codec.Export.unsafeNativizeVariables(byName(call.arguments));
    assert.deepEqual(inputs, {
      x: 108
    });
    outputs = Codec.Export.unsafeNativizeVariables(byName(call.returnValues));
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

    await bugger.runToEnd();

    const untied = bugger.view(txlog.proc.transactionLog);
    verifyNoIntermediates(untied);

    const root = bugger.view(txlog.views.transactionLog);
    const steps = bugger.view(trace.steps).length;
    assert.equal(root.type, "transaction");
    assert.lengthOf(root.actions, 1);
    let call = root.actions[0];
    assert.equal(call.type, "callexternal");
    assert.equal(call.kind, "constructor");
    assert.equal(call.address, instance.address);
    assert.isUndefined(call.functionName);
    assert.equal(call.contractName, "Secondary");
    assert.equal(call.returnKind, "return");
    assert.equal(call.beginStep, -1); //initial call considered to begin on step -1
    assert.equal(call.endStep, steps - 1);
    const expectedBytecode = abstractions.Secondary.binary;
    const expectedArgument = Codec.Conversion.toHexString(
      108,
      Codec.Evm.Utils.WORD_SIZE
    ).slice(2);
    assert.equal(call.raw.binary, expectedBytecode + expectedArgument);
    assert.notProperty(call.raw, "calldata");
    let inputs = Codec.Export.unsafeNativizeVariables(byName(call.arguments));
    assert.deepEqual(inputs, {
      y: 108
    });
    debug("immuts: %O", call.returnImmutables);
    let outputs = Codec.Export.unsafeNativizeVariables(
      byName(call.returnImmutables)
    );
    assert.deepEqual(outputs, {
      x: 2,
      w: 108
    });
    assert.lengthOf(call.actions, 2); //call to another, then log of Set
    call = call.actions[0];
    assert.equal(call.type, "callinternal");
    assert.equal(call.functionName, "another");
    assert.equal(call.contractName, "Secondary");
    assert.equal(call.returnKind, "return");
    assert.isAbove(
      call.endStep,
      call.beginStep,
      "beginStep should precede endStep for non-instant calls"
    );
    assert.lengthOf(call.arguments, 0);
    outputs = Codec.Export.unsafeNativizeVariables(byName(call.returnValues));
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

    await bugger.runToEnd();

    const untied = bugger.view(txlog.proc.transactionLog);
    verifyNoIntermediates(untied);

    const root = bugger.view(txlog.views.transactionLog);
    const steps = bugger.view(trace.steps).length;
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
    assert.equal(call.beginStep, -1); //initial call considered to begin on step -1
    assert.equal(call.endStep, steps - 1);
    assert.lengthOf(call.actions, 1);
    call = call.actions[0];
    assert.equal(call.type, "callexternal");
    assert.equal(call.kind, "function");
    assert.equal(call.address, library.address);
    assert.isTrue(call.isDelegate);
    assert.equal(call.functionName, "loudIncrement");
    assert.equal(call.contractName, "VizLibrary");
    assert.equal(call.returnKind, "return");
    assert.isAbove(
      call.endStep,
      call.beginStep,
      "beginStep should precede endStep for non-instant calls"
    );
    let inputs = Codec.Export.unsafeNativizeVariables(byName(call.arguments));
    assert.deepEqual(inputs, {
      x: 1
    });
    let outputs = Codec.Export.unsafeNativizeVariables(
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

    await bugger.runToEnd();

    const untied = bugger.view(txlog.proc.transactionLog);
    verifyNoIntermediates(untied);

    const root = bugger.view(txlog.views.transactionLog);
    const steps = bugger.view(trace.steps).length;
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
    assert.equal(call.beginStep, -1); //initial call considered to begin on step -1
    assert.equal(call.endStep, steps - 1);
    call = call.actions[0];
    assert.equal(call.type, "callexternal");
    assert.equal(call.kind, "message");
    assert.equal(call.address, origin);
    assert.equal(call.value.toNumber(), 1);
    assert.equal(call.returnKind, "return");
    assert.equal(
      call.endStep,
      call.beginStep,
      "beginStep should equal endStep for instant calls"
    );
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

    await bugger.runToEnd();

    const untied = bugger.view(txlog.proc.transactionLog);
    verifyNoIntermediates(untied);

    const root = bugger.view(txlog.views.transactionLog);
    const steps = bugger.view(trace.steps).length;
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
    assert.equal(call.beginStep, -1); //initial call considered to begin on step -1
    assert.equal(call.endStep, steps - 1);
    call = call.actions[0];
    assert.equal(call.type, "callinternal");
    assert.equal(call.functionName, "called");
    assert.equal(call.contractName, "VizTest");
    assert.equal(call.returnKind, "return");
    assert.isAbove(
      call.endStep,
      call.beginStep,
      "beginStep should precede endStep for non-instant calls"
    );
    let inputs = Codec.Export.unsafeNativizeVariables(byName(call.arguments));
    assert.deepEqual(inputs, {
      x: 4
    });
    let outputs = Codec.Export.unsafeNativizeVariables(
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
      await instance.testRevert({ gas: testDefaultTxGasLimit }); //this will throw because of the revert
    } catch (error) {
      txHash = error.receipt.transactionHash;
    }
    assert.isDefined(txHash, "should have errored and set txHash");

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    await bugger.runToEnd();

    const untied = bugger.view(txlog.proc.transactionLog);
    verifyNoIntermediates(untied);

    const root = bugger.view(txlog.views.transactionLog);
    const steps = bugger.view(trace.steps).length;
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
    assert.equal(call.beginStep, -1); //initial call considered to begin on step -1
    assert.equal(call.endStep, steps - 1);
    call = call.actions[0];
    assert.equal(call.type, "callinternal");
    assert.equal(call.functionName, "callReverter");
    assert.equal(call.contractName, "VizTest");
    assert.equal(call.returnKind, "revert");
    assert.lengthOf(call.arguments, 0);
    assert.equal(call.error.kind, "revert");
    assert.equal(call.endStep, steps - 1); //the internal and external call should end simultaneously
    assert.lengthOf(call.error.arguments, 1);
    assert.equal(
      Codec.Export.unsafeNativize(call.error.arguments[0].value),
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

    await bugger.runToEnd();
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
    let inputs = Codec.Export.unsafeNativizeVariables(byName(call.arguments));
    assert.deepEqual(inputs, {
      x: 108
    });
    assert.notProperty(call, "returnValues");
    assert.notProperty(call, "endStep");
    assert.lengthOf(call.actions, 0);
    assert.equal(call.beginStep, -1);
    assert.isTrue(call.waitingForFunctionDefinition);
    assert.isTrue(call.absorbNextInternalCall);
  });

  describe("Events", function () {
    it("Correctly logs events", async function () {
      this.timeout(12000);
      const instance = await abstractions.VizTest.deployed();
      const receipt = await instance.testEvent();
      const txHash = receipt.tx;

      const bugger = await Debugger.forTx(txHash, {
        provider,
        compilations
      });

      await bugger.runToEnd();

      const untied = bugger.view(txlog.proc.transactionLog);
      verifyNoIntermediates(untied);

      const root = bugger.view(txlog.views.transactionLog);
      assert.equal(root.type, "transaction");
      assert.lengthOf(root.actions, 1);
      const call = root.actions[0];
      //basic checks about the call itself
      assert.equal(call.type, "callexternal");
      assert.equal(call.kind, "function");
      assert.equal(call.address, instance.address);
      assert.equal(call.functionName, "testEvent");
      assert.equal(call.contractName, "VizTest");
      assert.lengthOf(call.actions, 2);
      //let's check the first event
      let event = call.actions[0];
      assert.equal(event.type, "event");
      let { decoding, raw } = event;
      assert.equal(decoding.kind, "event");
      assert.equal(decoding.decodingMode, "full");
      assert.equal(decoding.class.typeName, "VizTest");
      assert.equal(decoding.definedIn.typeName, "VizTest");
      assert.equal(decoding.abi.name, "TakesArgs");
      assert.lengthOf(decoding.abi.inputs, 2);
      assert.equal(decoding.abi.inputs[0].type, "uint256");
      assert.equal(decoding.abi.inputs[1].type, "uint256");
      assert.lengthOf(decoding.arguments, 2);
      assert.isTrue(decoding.arguments[0].indexed);
      assert.equal(decoding.arguments[0].name, "x");
      assert.isFalse(decoding.arguments[1].indexed);
      assert.equal(decoding.arguments[1].name, "y");
      const args = Codec.Export.unsafeNativizeVariables(
        byName(decoding.arguments)
      );
      assert.deepEqual(args, { x: 1, y: 2 });
      assert.deepEqual(raw.topics, [
        Codec.AbiData.Utils.abiSelector(decoding.abi),
        "0x0000000000000000000000000000000000000000000000000000000000000001"
      ]);
      assert.equal(
        raw.data,
        "0x0000000000000000000000000000000000000000000000000000000000000002"
      );
      //now for the second event
      event = call.actions[1];
      assert.equal(event.type, "event");
      ({ decoding, raw } = event);
      assert.equal(decoding.kind, "event");
      assert.equal(decoding.decodingMode, "full");
      assert.equal(decoding.class.typeName, "VizTest");
      assert.equal(decoding.definedIn.typeName, "Nothing");
      assert.equal(decoding.abi.name, "Bloop");
      assert.lengthOf(decoding.abi.inputs, 0);
      assert.lengthOf(decoding.arguments, 0);
      assert.deepEqual(raw.topics, [
        Codec.AbiData.Utils.abiSelector(decoding.abi)
      ]);
      assert.equal(raw.data, "0x");
    });

    it("Correctly logs an event inside a constructor", async function () {
      this.timeout(12000);
      const instance = await abstractions.Secondary.new(683);
      const txHash = instance.transactionHash;

      const bugger = await Debugger.forTx(txHash, {
        provider,
        compilations
      });

      await bugger.runToEnd();

      const untied = bugger.view(txlog.proc.transactionLog);
      verifyNoIntermediates(untied);

      const root = bugger.view(txlog.views.transactionLog);
      assert.equal(root.type, "transaction");
      assert.lengthOf(root.actions, 1);
      const call = root.actions[0];
      //basic checks about the call itself
      assert.equal(call.type, "callexternal");
      assert.equal(call.kind, "constructor");
      assert.equal(call.address, instance.address);
      assert.isUndefined(call.functionName);
      assert.equal(call.contractName, "Secondary");
      assert.lengthOf(call.actions, 2); //call to another, then log of Set
      const event = call.actions[1];
      assert.equal(event.type, "event");
      const { decoding, raw } = event;
      assert.equal(decoding.kind, "event");
      assert.equal(decoding.decodingMode, "full");
      assert.equal(decoding.class.typeName, "Secondary");
      assert.equal(decoding.definedIn.typeName, "Secondary");
      assert.equal(decoding.abi.name, "Set");
      assert.lengthOf(decoding.abi.inputs, 1);
      assert.equal(decoding.abi.inputs[0].type, "uint256");
      assert.lengthOf(decoding.arguments, 1);
      assert.isFalse(decoding.arguments[0].indexed);
      assert.isUndefined(decoding.arguments[0].name);
      assert.equal(
        Codec.Export.unsafeNativize(decoding.arguments[0].value),
        683
      );
      assert.deepEqual(raw.topics, [
        Codec.AbiData.Utils.abiSelector(decoding.abi)
      ]);
      assert.equal(
        raw.data,
        "0x00000000000000000000000000000000000000000000000000000000000002ab"
      ); //683 in hex
    });

    it("Correctly flattens events", async function () {
      this.timeout(12000);
      const instance = await abstractions.VizTest.deployed();
      const tertInstance = await abstractions.Tertiary.deployed();
      const libInstance = await abstractions.VizLibrary.deployed();
      const receipt = await instance.testFlatEvents();
      const txHash = receipt.tx;

      const bugger = await Debugger.forTx(txHash, {
        provider,
        compilations
      });

      await bugger.runToEnd();

      const flattedEvents = bugger.view(txlog.views.flattedEvents);
      assert.lengthOf(flattedEvents, 4);
      //event #0: Dummy()
      let event = flattedEvents[0];
      assert.strictEqual(event.decoding.abi.name, "Dummy");
      assert.strictEqual(event.address, instance.address);
      assert.strictEqual(event.codeAddress, instance.address);
      assert.isTrue(event.status);
      //event #1: Tert()
      event = flattedEvents[1];
      assert.strictEqual(event.decoding.abi.name, "Tert");
      assert.strictEqual(event.address, tertInstance.address);
      assert.strictEqual(event.codeAddress, tertInstance.address);
      assert.isFalse(event.status);
      //event #2: Noise()
      event = flattedEvents[2];
      assert.strictEqual(event.decoding.abi.name, "Noise");
      assert.strictEqual(event.address, tertInstance.address);
      assert.strictEqual(event.codeAddress, libInstance.address);
      assert.isFalse(event.status);
      //event #3: Dummy()
      event = flattedEvents[3];
      assert.strictEqual(event.decoding.abi.name, "Dummy");
      assert.strictEqual(event.address, instance.address);
      assert.strictEqual(event.codeAddress, instance.address);
      assert.isTrue(event.status);

      //now: check that they all have steps and are in increasing order
      let previousStep = -1;
      for (const event of flattedEvents) {
        assert.isFinite(event.step);
        assert.isAbove(
          event.step,
          previousStep,
          "steps should be in increasing order"
        );
        previousStep = event.step;
      }
    });

    it("Correctly logs an event inside a library", async function () {
      this.timeout(12000);
      const instance = await abstractions.VizTest.deployed();
      const library = await abstractions.VizLibrary.deployed();
      const receipt = await instance.testLibrary();
      const txHash = receipt.tx;

      const bugger = await Debugger.forTx(txHash, {
        provider,
        compilations
      });

      await bugger.runToEnd();

      const untied = bugger.view(txlog.proc.transactionLog);
      verifyNoIntermediates(untied);

      const root = bugger.view(txlog.views.transactionLog);
      assert.equal(root.type, "transaction");
      assert.lengthOf(root.actions, 1);
      const call = root.actions[0];
      //basic checks about the outer call
      assert.equal(call.type, "callexternal");
      assert.equal(call.kind, "function");
      assert.equal(call.address, instance.address);
      assert.equal(call.functionName, "testLibrary");
      assert.equal(call.contractName, "VizTest");
      assert.lengthOf(call.actions, 1);
      const libCall = call.actions[0];
      //basic checks about the inner call
      assert.equal(libCall.type, "callexternal");
      assert.equal(libCall.kind, "function");
      assert.equal(libCall.address, library.address);
      assert.isTrue(libCall.isDelegate);
      assert.equal(libCall.functionName, "loudIncrement");
      assert.equal(libCall.contractName, "VizLibrary");
      assert.lengthOf(libCall.actions, 1);
      const event = libCall.actions[0];
      assert.equal(event.type, "event");
      const { decoding, raw } = event;
      assert.equal(decoding.kind, "event");
      assert.equal(decoding.decodingMode, "full");
      assert.equal(decoding.class.typeName, "VizLibrary");
      assert.equal(decoding.definedIn.typeName, "VizLibrary");
      assert.equal(decoding.abi.name, "Noise");
      assert.lengthOf(decoding.abi.inputs, 0);
      assert.lengthOf(decoding.arguments, 0);
      assert.deepEqual(raw.topics, [
        Codec.AbiData.Utils.abiSelector(decoding.abi)
      ]);
      assert.equal(raw.data, "0x");
    });

    it("Correctly disambiguates ambiguous events", async function () {
      this.timeout(12000);
      const instance = await abstractions.VizTest.deployed();
      const receipt = await instance.testConfusing();
      const txHash = receipt.tx;

      const bugger = await Debugger.forTx(txHash, {
        provider,
        compilations
      });

      await bugger.runToEnd();

      const untied = bugger.view(txlog.proc.transactionLog);
      verifyNoIntermediates(untied);

      const root = bugger.view(txlog.views.transactionLog);
      assert.equal(root.type, "transaction");
      assert.lengthOf(root.actions, 1);
      const call = root.actions[0];
      //basic checks about the outer call
      assert.equal(call.type, "callexternal");
      assert.equal(call.kind, "function");
      assert.equal(call.address, instance.address);
      assert.equal(call.functionName, "testConfusing");
      assert.equal(call.contractName, "VizTest");
      assert.lengthOf(call.actions, 2);
      let event = call.actions[0];
      //checks about first event
      assert.equal(event.type, "event");
      let decoding = event.decoding;
      assert.equal(decoding.kind, "event");
      assert.equal(decoding.decodingMode, "full");
      assert.equal(decoding.class.typeName, "VizTest");
      assert.equal(decoding.definedIn.typeName, "VizTest");
      assert.equal(decoding.abi.name, "Confusing");
      assert.lengthOf(decoding.abi.inputs, 3);
      assert.isTrue(decoding.abi.inputs[1].indexed);
      assert.lengthOf(decoding.arguments, 3);
      let args = Codec.Export.unsafeNativizeVariables(
        byName(decoding.arguments)
      );
      assert.deepEqual(args, {
        a: 1,
        b: "0xdeadbeef00000000000000000000000000000000000000000000000000000000",
        c: 3
      });
      const libCall = call.actions[1];
      //basic checks about the inner call
      assert.equal(libCall.type, "callinternal");
      assert.equal(libCall.functionName, "confuse");
      assert.equal(libCall.contractName, "VizLibrary");
      assert.lengthOf(libCall.actions, 1);
      event = libCall.actions[0];
      //checks about second event
      assert.equal(event.type, "event");
      decoding = event.decoding;
      assert.equal(decoding.kind, "event");
      assert.equal(decoding.decodingMode, "full");
      assert.equal(decoding.class.typeName, "VizLibrary");
      assert.equal(decoding.definedIn.typeName, "VizLibrary");
      assert.equal(decoding.abi.name, "Confusing");
      assert.lengthOf(decoding.abi.inputs, 3);
      assert.isTrue(decoding.abi.inputs[2].indexed);
      assert.lengthOf(decoding.arguments, 3);
      args = Codec.Export.unsafeNativizeVariables(byName(decoding.arguments));
      assert.deepEqual(args, {
        x: 4,
        y: "0xdeadf00f00000000000000000000000000000000000000000000000000000000",
        z: 6
      });
    });
  });

  describe("Storage writes", function () {
    it("Logs raw storage write info", async function () {
      this.timeout(12000);
      const tertInstance = await abstractions.Tertiary.deployed();
      const instance = await abstractions.VizTest.new(tertInstance.address);
      const txHash = instance.transactionHash;

      const bugger = await Debugger.forTx(txHash, {
        provider,
        compilations
      });

      await bugger.runToEnd();

      const untied = bugger.view(txlog.proc.transactionLog);
      verifyNoIntermediates(untied);

      const root = bugger.view(txlog.views.transactionLog);
      const steps = bugger.view(trace.steps).length;
      assert.equal(root.type, "transaction");
      assert.lengthOf(root.actions, 1);
      const call = root.actions[0];
      assert.equal(call.type, "callexternal");
      assert.equal(call.kind, "constructor");
      assert.equal(call.address, instance.address);
      assert.lengthOf(call.actions, 1);
      const write = call.actions[0];
      assert.equal(write.type, "write");
      const entries = Object.entries(write.raw);
      assert.lengthOf(entries, 1);
      const [[key, value]] = entries;
      assert.equal(key, "0x" + "00".repeat(32)); //zero word
      assert.equal(
        value,
        "0x" +
          tertInstance.address
            .slice(2)
            .toLowerCase()
            .padStart(2 * 32, "00")
      ); //tertInstance.address as word
      const stepEntries = Object.entries(write.steps);
      assert.lengthOf(stepEntries, 1);
      const [[stepKey, step]] = stepEntries;
      assert.equal(stepKey, key);
      assert.isAbove(step, 0);
      assert.isBelow(step, steps);
    });
  });
});
