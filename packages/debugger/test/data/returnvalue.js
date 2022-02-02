import debugModule from "debug";
const debug = debugModule("debugger:test:data:returnvalue");

import { assert } from "chai";

import Ganache from "ganache";

import { prepareContracts } from "../helpers";
import Debugger from "lib/debugger";

import * as Codec from "@truffle/codec";

const __RETURNVALUES = `
pragma solidity ^0.8.0;

contract ReturnValues {

  int8 immutable minus = -1;
  function() internal immutable trap = fail;

  constructor(bool fail) {
    if(fail) {
      selfdestruct(payable(tx.origin));
    }
  }

  function fail() public {
    revert();
  }

  function failNoisy() public {
    revert("Noise!");
  }

  function pair() public returns (int x, int) {
    return (minus, -2);
  }

  function panic() public {
    assert(false);
  }

  function dummy() public {
    trap();
  }
}

library ReturnLibrary {
}

contract Default {
  int8 immutable minus = -1;
  event Int(int8);
  function run() public {
    emit Int(minus);
  }
}
`;

const __CUSTOMERRORS = `
pragma solidity ^0.8.4;

error Global();

contract ErrorTest {

  Auxiliary aux;

  constructor(Auxiliary _aux) {
    aux = _aux;
  }

  error Local(int x, int y);
  error h9316(bytes32 x); //selector shared w/ b27072

  function local() public {
    revert Local(-1, -2);
  }

  function global() public {
    revert Global();
  }

  function foreign() public {
    revert Auxiliary.Foreign();
  }

  function inlined() public {
    AuxLib.inlined();
  }

  function makeCall() public {
    aux.fail();
  }

  function ambiguous() public {
    revert h9316(hex"");
  }

  function ambiguousCall() public {
    aux.ambiguous();
  }
}

contract Auxiliary {
  error Foreign();
  error VeryForeign();
  error b27072(uint x); //selector shared w/ h3916

  function fail() public {
    revert VeryForeign();
  }

  function ambiguous() public {
    revert b27072(0);
  }
}

library AuxLib {
  error LibraryError();
  function inlined() internal {
    revert LibraryError();
  }

  function dummy() external {
  }
}
`;

const __MIGRATION = `
var ReturnValues = artifacts.require("ReturnValues");
var ReturnLibrary = artifacts.require("ReturnLibrary");
var Default = artifacts.require("Default");
var Auxiliary = artifacts.require("Auxiliary");
var ErrorTest = artifacts.require("ErrorTest");

module.exports = async function(deployer) {
  await deployer.deploy(ReturnValues, false);
  await deployer.deploy(ReturnLibrary);
  await deployer.deploy(Default);
  await deployer.deploy(Auxiliary);
  const aux = await Auxiliary.deployed();
  await deployer.deploy(ErrorTest, aux.address);
};
`;

let sources = {
  "ReturnValues.sol": __RETURNVALUES,
  "CustomErrors.sol": __CUSTOMERRORS
};

let migrations = {
  "2_deploy_contracts.js": __MIGRATION
};

describe("Return value decoding", function () {
  let provider;
  let abstractions;
  let compilations;

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

    let prepared = await prepareContracts(provider, sources, migrations);
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;
  });

  it("Decodes return values correctly", async function () {
    this.timeout(9000);

    let instance = await abstractions.ReturnValues.deployed();
    let receipt = await instance.pair();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    await bugger.runToEnd();

    const decodings = await bugger.returnValue();
    assert.lengthOf(decodings, 1);
    const decoding = decodings[0];
    assert.strictEqual(decoding.kind, "return");
    const outputs = decoding.arguments;
    assert.lengthOf(outputs, 2);
    assert.strictEqual(outputs[0].name, "x");
    assert.isUndefined(outputs[1].name);
    const values = outputs.map(({ value }) =>
      Codec.Format.Utils.Inspect.unsafeNativize(value)
    );
    assert.deepEqual(values, [-1, -2]);
  });

  it("Decodes bytecode", async function () {
    this.timeout(12000);

    let instance = await abstractions.ReturnValues.new(false);
    let txHash = instance.transactionHash;
    debug("txHash: %s", txHash);

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    debug("about to run!");
    await bugger.runToEnd();
    debug("ran!");

    const decodings = await bugger.returnValue();
    assert.lengthOf(decodings, 1);
    const decoding = decodings[0];
    assert.strictEqual(decoding.kind, "bytecode");
    assert.strictEqual(decoding.class.typeName, "ReturnValues");
    const immutables = decoding.immutables;
    debug("immutables: %O", immutables);
    assert.lengthOf(immutables, 2);
    assert.strictEqual(immutables[0].name, "minus");
    assert.strictEqual(immutables[0].class.typeName, "ReturnValues");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(immutables[0].value),
      -1
    );
    assert.strictEqual(immutables[1].name, "trap");
    assert.strictEqual(immutables[1].class.typeName, "ReturnValues");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(immutables[1].value),
      "ReturnValues.fail"
    );
  });

  it("Decodes library bytecode", async function () {
    this.timeout(12000);

    let instance = await abstractions.ReturnLibrary.new();
    let txHash = instance.transactionHash;
    debug("txHash: %s", txHash);

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    debug("about to run!");
    await bugger.runToEnd();
    debug("ran!");

    const decodings = await bugger.returnValue();
    assert.lengthOf(decodings, 1);
    const decoding = decodings[0];
    assert.strictEqual(decoding.kind, "bytecode");
    assert.strictEqual(decoding.class.typeName, "ReturnLibrary");
    assert.strictEqual(decoding.address, instance.address);
  });

  it("Decodes bytecode from a default constructor", async function () {
    this.timeout(12000);

    let instance = await abstractions.Default.new();
    let txHash = instance.transactionHash;
    debug("txHash: %s", txHash);

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    debug("about to run!");
    await bugger.runToEnd();
    debug("ran!");

    const decodings = await bugger.returnValue();
    assert.lengthOf(decodings, 1);
    const decoding = decodings[0];
    assert.strictEqual(decoding.kind, "bytecode");
    assert.strictEqual(decoding.class.typeName, "Default");
    const immutables = decoding.immutables;
    assert.lengthOf(immutables, 1);
    assert.strictEqual(immutables[0].name, "minus");
    assert.strictEqual(immutables[0].class.typeName, "Default");
    assert.strictEqual(
      Codec.Format.Utils.Inspect.unsafeNativize(immutables[0].value),
      -1
    );
  });

  it("Decodes messageless revert", async function () {
    this.timeout(9000);

    //HACK: because this transaction makes web3 throw, we have to extract the hash from
    //the resulting exception (there is supposed to be a non-hacky way but it
    //does not presently work)
    let instance = await abstractions.ReturnValues.deployed();
    let txHash;
    try {
      await instance.fail(); //web3 throws on failure
    } catch (error) {
      txHash = error.receipt.transactionHash;
    }
    assert.isDefined(txHash, "should have errored and set txHash");

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    await bugger.runToEnd();

    const decodings = await bugger.returnValue();
    assert.lengthOf(decodings, 1);
    const decoding = decodings[0];
    assert.strictEqual(decoding.kind, "failure");
  });

  it("Decodes revert string", async function () {
    this.timeout(9000);

    //HACK: because this transaction makes web3 throw, we have to extract the hash from
    //the resulting exception (there is supposed to be a non-hacky way but it
    //does not presently work)
    let instance = await abstractions.ReturnValues.deployed();
    let txHash;
    try {
      await instance.failNoisy(); //web3 throws on failure
    } catch (error) {
      txHash = error.receipt.transactionHash;
    }
    assert.isDefined(txHash, "should have errored and set txHash");

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    await bugger.runToEnd();

    const decodings = await bugger.returnValue();
    assert.lengthOf(decodings, 1);
    const decoding = decodings[0];
    assert.strictEqual(decoding.kind, "revert");
    assert.strictEqual(decoding.abi.name, "Error");
    assert.isNull(decoding.definedIn);
    const outputs = decoding.arguments;
    assert.lengthOf(outputs, 1);
    assert.isUndefined(outputs[0].name);
    const message = Codec.Format.Utils.Inspect.unsafeNativize(outputs[0].value);
    assert.strictEqual(message, "Noise!");
  });

  it("Decodes panic code", async function () {
    this.timeout(9000);

    //HACK: because this transaction makes web3 throw, we have to extract the hash from
    //the resulting exception (there is supposed to be a non-hacky way but it
    //does not presently work)
    let instance = await abstractions.ReturnValues.deployed();
    let txHash;
    try {
      await instance.panic(); //web3 throws on failure
    } catch (error) {
      txHash = error.receipt.transactionHash;
    }
    assert.isDefined(txHash, "should have errored and set txHash");

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    await bugger.runToEnd();

    const decodings = await bugger.returnValue();
    assert.lengthOf(decodings, 1);
    const decoding = decodings[0];
    assert.strictEqual(decoding.kind, "revert");
    assert.strictEqual(decoding.abi.name, "Panic");
    assert.isNull(decoding.definedIn);
    const outputs = decoding.arguments;
    assert.lengthOf(outputs, 1);
    assert.isUndefined(outputs[0].name);
    const panicCode = Codec.Format.Utils.Inspect.unsafeNativize(
      outputs[0].value
    );
    assert.strictEqual(panicCode, 1);
  });

  describe("Custom errors", function () {
    it("Decodes custom errors", async function () {
      this.timeout(9000);

      //HACK: because this transaction makes web3 throw, we have to extract the hash from
      //the resulting exception (there is supposed to be a non-hacky way but it
      //does not presently work)
      let instance = await abstractions.ErrorTest.deployed();
      let txHash;
      try {
        await instance.local(); //web3 throws on failure
      } catch (error) {
        txHash = error.receipt.transactionHash;
      }
      assert.isDefined(txHash, "should have errored and set txHash");

      let bugger = await Debugger.forTx(txHash, { provider, compilations });

      await bugger.runToEnd();

      const decodings = await bugger.returnValue();
      assert.lengthOf(decodings, 1);
      const decoding = decodings[0];
      assert.strictEqual(decoding.kind, "revert");
      assert.strictEqual(decoding.decodingMode, "full");
      assert.strictEqual(decoding.abi.name, "Local");
      assert.strictEqual(decoding.definedIn.typeName, "ErrorTest");
      const outputs = decoding.arguments;
      assert.lengthOf(outputs, 2);
      assert.strictEqual(outputs[0].name, "x");
      assert.strictEqual(
        Codec.Format.Utils.Inspect.unsafeNativize(outputs[0].value),
        -1
      );
      assert.strictEqual(outputs[1].name, "y");
      assert.strictEqual(
        Codec.Format.Utils.Inspect.unsafeNativize(outputs[1].value),
        -2
      );
    });

    it("Decodes global custom errors", async function () {
      this.timeout(9000);

      //HACK: because this transaction makes web3 throw, we have to extract the hash from
      //the resulting exception (there is supposed to be a non-hacky way but it
      //does not presently work)
      let instance = await abstractions.ErrorTest.deployed();
      let txHash;
      try {
        await instance.global(); //web3 throws on failure
      } catch (error) {
        txHash = error.receipt.transactionHash;
      }
      assert.isDefined(txHash, "should have errored and set txHash");

      let bugger = await Debugger.forTx(txHash, { provider, compilations });

      await bugger.runToEnd();

      const decodings = await bugger.returnValue();
      assert.lengthOf(decodings, 1);
      const decoding = decodings[0];
      assert.strictEqual(decoding.kind, "revert");
      assert.strictEqual(decoding.decodingMode, "full");
      assert.strictEqual(decoding.abi.name, "Global");
      assert.isNull(decoding.definedIn);
      const outputs = decoding.arguments;
      assert.lengthOf(outputs, 0);
    });

    it("Decodes custom errors declared in other contracts", async function () {
      this.timeout(9000);

      //HACK: because this transaction makes web3 throw, we have to extract the hash from
      //the resulting exception (there is supposed to be a non-hacky way but it
      //does not presently work)
      let instance = await abstractions.ErrorTest.deployed();
      let txHash;
      try {
        await instance.foreign(); //web3 throws on failure
      } catch (error) {
        txHash = error.receipt.transactionHash;
      }
      assert.isDefined(txHash, "should have errored and set txHash");

      let bugger = await Debugger.forTx(txHash, { provider, compilations });

      await bugger.runToEnd();

      const decodings = await bugger.returnValue();
      assert.lengthOf(decodings, 1);
      const decoding = decodings[0];
      assert.strictEqual(decoding.kind, "revert");
      assert.strictEqual(decoding.decodingMode, "full");
      assert.strictEqual(decoding.abi.name, "Foreign");
      assert.strictEqual(decoding.definedIn.typeName, "Auxiliary");
      const outputs = decoding.arguments;
      assert.lengthOf(outputs, 0);
    });

    it("Decodes custom errors inlined from libraries", async function () {
      this.timeout(9000);

      //HACK: because this transaction makes web3 throw, we have to extract the hash from
      //the resulting exception (there is supposed to be a non-hacky way but it
      //does not presently work)
      let instance = await abstractions.ErrorTest.deployed();
      let txHash;
      try {
        await instance.inlined(); //web3 throws on failure
      } catch (error) {
        txHash = error.receipt.transactionHash;
      }
      assert.isDefined(txHash, "should have errored and set txHash");

      let bugger = await Debugger.forTx(txHash, { provider, compilations });

      await bugger.runToEnd();

      const decodings = await bugger.returnValue();
      assert.lengthOf(decodings, 1);
      const decoding = decodings[0];
      assert.strictEqual(decoding.kind, "revert");
      assert.strictEqual(decoding.decodingMode, "full");
      assert.strictEqual(decoding.abi.name, "LibraryError");
      assert.strictEqual(decoding.definedIn.typeName, "AuxLib");
      const outputs = decoding.arguments;
      assert.lengthOf(outputs, 0);
    });

    it("Decodes custom errors forwarded from external calls", async function () {
      this.timeout(9000);

      //HACK: because this transaction makes web3 throw, we have to extract the hash from
      //the resulting exception (there is supposed to be a non-hacky way but it
      //does not presently work)
      let instance = await abstractions.ErrorTest.deployed();
      let txHash;
      try {
        await instance.makeCall(); //web3 throws on failure
      } catch (error) {
        txHash = error.receipt.transactionHash;
      }
      assert.isDefined(txHash, "should have errored and set txHash");

      let bugger = await Debugger.forTx(txHash, { provider, compilations });

      await bugger.runToEnd();

      const decodings = await bugger.returnValue();
      assert.lengthOf(decodings, 1);
      const decoding = decodings[0];
      assert.strictEqual(decoding.kind, "revert");
      assert.strictEqual(decoding.decodingMode, "full");
      assert.strictEqual(decoding.abi.name, "VeryForeign");
      assert.strictEqual(decoding.definedIn.typeName, "Auxiliary");
      const outputs = decoding.arguments;
      assert.lengthOf(outputs, 0);
    });

    it("Decodes ambiguous custom errors using stacktrace info", async function () {
      this.timeout(9000);

      //HACK: because this transaction makes web3 throw, we have to extract the hash from
      //the resulting exception (there is supposed to be a non-hacky way but it
      //does not presently work)
      let instance = await abstractions.ErrorTest.deployed();
      let txHash;
      try {
        await instance.ambiguous(); //web3 throws on failure
      } catch (error) {
        txHash = error.receipt.transactionHash;
      }
      assert.isDefined(txHash, "should have errored and set txHash");

      let bugger = await Debugger.forTx(txHash, { provider, compilations });

      await bugger.runToEnd();

      const decodings = await bugger.returnValue();
      assert.lengthOf(decodings, 1);
      const decoding = decodings[0];
      assert.strictEqual(decoding.kind, "revert");
      assert.strictEqual(decoding.decodingMode, "full");
      assert.strictEqual(decoding.abi.name, "h9316");
      assert.strictEqual(decoding.definedIn.typeName, "ErrorTest");
      const outputs = decoding.arguments;
      assert.lengthOf(outputs, 1);
      assert.strictEqual(outputs[0].name, "x");
      assert.strictEqual(
        Codec.Format.Utils.Inspect.unsafeNativize(outputs[0].value),
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Decodes ambiguous custom errors forwarded from external calls using stacktrace info", async function () {
      this.timeout(9000);

      //HACK: because this transaction makes web3 throw, we have to extract the hash from
      //the resulting exception (there is supposed to be a non-hacky way but it
      //does not presently work)
      let instance = await abstractions.ErrorTest.deployed();
      let txHash;
      try {
        await instance.ambiguousCall(); //web3 throws on failure
      } catch (error) {
        txHash = error.receipt.transactionHash;
      }
      assert.isDefined(txHash, "should have errored and set txHash");

      let bugger = await Debugger.forTx(txHash, { provider, compilations });

      await bugger.runToEnd();

      const decodings = await bugger.returnValue();
      assert.lengthOf(decodings, 1);
      const decoding = decodings[0];
      assert.strictEqual(decoding.kind, "revert");
      assert.strictEqual(decoding.decodingMode, "full");
      assert.strictEqual(decoding.abi.name, "b27072");
      assert.strictEqual(decoding.definedIn.typeName, "Auxiliary");
      const outputs = decoding.arguments;
      assert.lengthOf(outputs, 1);
      assert.strictEqual(outputs[0].name, "x");
      assert.strictEqual(
        Codec.Format.Utils.Inspect.unsafeNativize(outputs[0].value),
        0
      );
    });
  });
});
