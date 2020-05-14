import debugModule from "debug";
const debug = debugModule("test:data:returnvalue");

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts } from "../helpers";
import Debugger from "lib/debugger";

import * as Codec from "@truffle/codec";

const __RETURNVALUES = `
pragma solidity ^0.6.6;

contract ReturnValues {
  constructor(bool fail) public {
    if(fail) {
      selfdestruct(tx.origin);
    }
  }

  function fail() public {
    revert();
  }

  function failNoisy() public {
    revert("Noise!");
  }

  function pair() public returns (int x, int) {
    return (-1, -2);
  }
}

library ReturnLibrary {
}
`;

const __MIGRATION = `
var ReturnValues = artifacts.require("ReturnValues");
var ReturnLibrary = artifacts.require("ReturnLibrary");

module.exports = function(deployer) {
  deployer.deploy(ReturnValues, false);
  deployer.deploy(ReturnLibrary);
};
`;

let sources = {
  "ReturnValues.sol": __RETURNVALUES
};

let migrations = {
  "2_deploy_contracts.js": __MIGRATION
};

describe("Return value decoding", function() {
  var provider;

  var abstractions;
  var compilations;

  before("Create Provider", async function() {
    provider = Ganache.provider({ seed: "debugger", gasLimit: 7000000 });
  });

  before("Prepare contracts and artifacts", async function() {
    this.timeout(30000);

    let prepared = await prepareContracts(provider, sources, migrations);
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;
  });

  it("Decodes return values correctly", async function() {
    this.timeout(9000);

    let instance = await abstractions.ReturnValues.deployed();
    let receipt = await instance.pair();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    await bugger.continueUntilBreakpoint(); //run till end

    const decodings = await bugger.returnValue();
    assert.lengthOf(decodings, 1);
    const decoding = decodings[0];
    assert.strictEqual(decoding.kind, "return");
    const outputs = decoding.arguments;
    assert.lengthOf(outputs, 2);
    assert.strictEqual(outputs[0].name, "x");
    assert.isUndefined(outputs[1].name);
    const values = outputs.map(({ value }) =>
      Codec.Format.Utils.Inspect.nativize(value)
    );
    assert.deepEqual(values, [-1, -2]);
  });

  it("Decodes bytecode", async function() {
    this.timeout(12000);

    let instance = await abstractions.ReturnValues.new(false);
    let txHash = instance.transactionHash;
    debug("txHash: %s", txHash);

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    debug("about to run!");
    await bugger.continueUntilBreakpoint(); //run till end
    debug("ran!");

    const decodings = await bugger.returnValue();
    assert.lengthOf(decodings, 1);
    const decoding = decodings[0];
    assert.strictEqual(decoding.kind, "bytecode");
    assert.strictEqual(decoding.class.typeName, "ReturnValues");
  });

  it("Decodes library bytecode", async function() {
    this.timeout(12000);

    let instance = await abstractions.ReturnLibrary.new();
    let txHash = instance.transactionHash;
    debug("txHash: %s", txHash);

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    debug("about to run!");
    await bugger.continueUntilBreakpoint(); //run till end
    debug("ran!");

    const decodings = await bugger.returnValue();
    assert.lengthOf(decodings, 1);
    const decoding = decodings[0];
    assert.strictEqual(decoding.kind, "bytecode");
    assert.strictEqual(decoding.class.typeName, "ReturnLibrary");
    assert.strictEqual(decoding.address, instance.address);
  });

  it("Decodes messageless revert", async function() {
    this.timeout(9000);

    //HACK: because this transaction makes web3 throw, we have to extract the hash from
    //the resulting exception (there is supposed to be a non-hacky way but it
    //does not presently work)
    let instance = await abstractions.ReturnValues.deployed();
    let txHash;
    try {
      await instance.fail(); //web3 throws on failure
    } catch (error) {
      txHash = error.hashes[0]; //it's the only hash involved
    }

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    await bugger.continueUntilBreakpoint(); //run till end

    const decodings = await bugger.returnValue();
    assert.lengthOf(decodings, 1);
    const decoding = decodings[0];
    assert.strictEqual(decoding.kind, "failure");
  });

  it("Decodes revert string", async function() {
    this.timeout(9000);

    //HACK: because this transaction makes web3 throw, we have to extract the hash from
    //the resulting exception (there is supposed to be a non-hacky way but it
    //does not presently work)
    let instance = await abstractions.ReturnValues.deployed();
    let txHash;
    try {
      await instance.failNoisy(); //web3 throws on failure
    } catch (error) {
      txHash = error.hashes[0]; //it's the only hash involved
    }

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    await bugger.continueUntilBreakpoint(); //run till end

    const decodings = await bugger.returnValue();
    assert.lengthOf(decodings, 1);
    const decoding = decodings[0];
    assert.strictEqual(decoding.kind, "revert");
    const outputs = decoding.arguments;
    assert.lengthOf(outputs, 1);
    const message = Codec.Format.Utils.Inspect.nativize(outputs[0].value);
    assert.strictEqual(message, "Noise!");
  });
});
