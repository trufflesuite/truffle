import debugModule from "debug";
const debug = debugModule("test:data:global");

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts, lineOf } from "../helpers";
import Debugger from "lib/debugger";

import * as TruffleDecodeUtils from "truffle-decode-utils";

import solidity from "lib/solidity/selectors";

const __GLOBAL = `
pragma solidity ^0.5.4;

contract GlobalTest {

  event Done(uint x);

  struct Msg {
    bytes data;
    address payable sender;
    bytes4 sig;
    uint value;
  }

  struct Tx {
    address payable origin;
    uint gasprice;
  }

  struct Block {
    address payable coinbase;
    uint difficulty;
    uint gaslimit;
    uint number;
    uint timestamp;
  }

  Msg _msg;
  Tx _tx;
  Block _block;
  GlobalTest _this;
  uint _now;

  function run(uint x) public payable {
    _this = this;
    _now = now;
    _msg = Msg(msg.data, msg.sender, msg.sig, msg.value);
    _tx = Tx(tx.origin, tx.gasprice);
    _block = Block(block.coinbase, block.difficulty,
      block.gaslimit, block.number, block.timestamp);
    emit Done(x); //BREAK SIMPLE
  }

  function runRun(uint x) public payable {
    this.run.value(msg.value / 2)(x);
  }

  function staticTest(uint x) public view returns (uint) {
    Msg memory __msg;
    Tx memory __tx;
    Block memory __block;
    GlobalTest __this;
    uint __now;
    __this = this;
    __now = now;
    __msg = Msg(msg.data, msg.sender, msg.sig, 0);
    __tx = Tx(tx.origin, tx.gasprice);
    __block = Block(block.coinbase, block.difficulty,
      block.gaslimit, block.number, block.timestamp);
    return x + uint(address(__this)) + __now         //BREAK STATIC
      + __msg.value + __tx.gasprice + __block.number;
  }

  function runStatic(uint x) public {
    emit Done(this.staticTest(x));
  }

  function runLib(uint x) public payable {
    GlobalTestLib.run(x);
  }

  function runCreate(uint x) public payable {
    (new CreationTest).value(msg.value / 2)(x);
  }
}

contract CreationTest {
  GlobalTest.Msg _msg;
  GlobalTest.Tx _tx;
  GlobalTest.Block _block;
  CreationTest _this;
  uint _now;

  event Done(uint x);

  constructor(uint x) public payable {
    _this = this;
    _now = now;
    _msg = GlobalTest.Msg(msg.data, msg.sender, msg.sig, msg.value);
    _tx = GlobalTest.Tx(tx.origin, tx.gasprice);
    _block = GlobalTest.Block(block.coinbase, block.difficulty,
      block.gaslimit, block.number, block.timestamp);
    emit Done(x); //BREAK CREATE
  }
}

library GlobalTestLib {

  event Done(uint x);

  function run(uint x) external {
    GlobalTest.Msg memory __msg;
    GlobalTest.Tx memory __tx;
    GlobalTest.Block memory __block;
    GlobalTestLib __this;
    uint __now;
    __this = this;
    __now = now;
    __msg = GlobalTest.Msg(msg.data, msg.sender, msg.sig, msg.value);
    __tx = GlobalTest.Tx(tx.origin, tx.gasprice);
    __block = GlobalTest.Block(block.coinbase, block.difficulty,
      block.gaslimit, block.number, block.timestamp);
    emit Done(x + uint(address(__this)) + __now       //BREAK LIBRARY
      + __msg.value + __tx.gasprice + __block.number);
  }
}
`;

const __MIGRATION = `
var GlobalTest = artifacts.require("GlobalTest");
var CreationTest = artifacts.require("CreationTest");
var GlobalTestLib = artifacts.require("GlobalTestLib");

module.exports = function(deployer) {
  deployer.deploy(GlobalTestLib);
  deployer.link(GlobalTestLib, GlobalTest);
  deployer.deploy(GlobalTest);
};
`;

let sources = {
  "GlobalTest.sol": __GLOBAL
};

let migrations = {
  "2_deploy_contracts.js": __MIGRATION
};

describe("Globally-available variables", function() {
  var provider;

  var abstractions;
  var artifacts;
  var files;

  before("Create Provider", async function() {
    this.skip();
    provider = Ganache.provider({ seed: "debugger", gasLimit: 7000000 });
  });

  before("Prepare contracts and artifacts", async function() {
    this.skip();
    this.timeout(30000);

    let prepared = await prepareContracts(provider, sources, migrations);
    abstractions = prepared.abstractions;
    artifacts = prepared.artifacts;
    files = prepared.files;
  });

  it("Gets globals correctly in simple call", async function() {
    this.skip();
    this.timeout(8000);
    let instance = await abstractions.GlobalTest.deployed();
    let receipt = await instance.run(9, { value: 100 });
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      files,
      contracts: artifacts
    });

    let session = bugger.connect();

    await session.continueUntilBreakpoint(); //run till end

    const variables = TruffleDecodeUtils.Conversion.cleanBNs(
      await session.variables()
    );

    assert.equal(variables.this, variables._this);
    assert.deepEqual(variables.msg, variables._msg);
    assert.deepEqual(variables.tx, variables._tx);
    assert.deepEqual(variables.block, variables._block);
    assert.equal(variables.now, variables._now);
  });

  it("Gets globals correctly in nested call", async function() {
    this.skip();
    this.timeout(8000);
    let instance = await abstractions.GlobalTest.deployed();
    let receipt = await instance.runRun(9, { value: 100 });
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      files,
      contracts: artifacts
    });

    let session = bugger.connect();

    let sourceId = session.view(solidity.current.source).id;
    let source = session.view(solidity.current.source).source;
    await session.addBreakpoint({
      sourceId,
      line: lineOf("BREAK SIMPLE", source)
    });
    await session.continueUntilBreakpoint();

    const variables = TruffleDecodeUtils.Conversion.cleanBNs(
      await session.variables()
    );

    assert.equal(variables.this, variables._this);
    assert.deepEqual(variables.msg, variables._msg);
    assert.deepEqual(variables.tx, variables._tx);
    assert.deepEqual(variables.block, variables._block);
    assert.equal(variables.now, variables._now);
  });

  it("Gets globals correctly in static call", async function() {
    this.skip();
    this.timeout(8000);
    let instance = await abstractions.GlobalTest.deployed();
    let receipt = await instance.runStatic(9);
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      files,
      contracts: artifacts
    });

    let session = bugger.connect();

    let sourceId = session.view(solidity.current.source).id;
    let source = session.view(solidity.current.source).source;
    await session.addBreakpoint({
      sourceId,
      line: lineOf("BREAK STATIC", source)
    });
    await session.continueUntilBreakpoint();

    const variables = TruffleDecodeUtils.Conversion.cleanBNs(
      await session.variables()
    );

    assert.equal(variables.this, variables.__this);
    assert.deepEqual(variables.msg, variables.__msg);
    assert.deepEqual(variables.tx, variables.__tx);
    assert.deepEqual(variables.block, variables.__block);
    assert.equal(variables.now, variables.__now);
  });

  it("Gets globals correctly in library call", async function() {
    this.skip();
    this.timeout(8000);
    let instance = await abstractions.GlobalTest.deployed();
    let receipt = await instance.runLib(9, { value: 100 });
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      files,
      contracts: artifacts
    });

    let session = bugger.connect();

    let sourceId = session.view(solidity.current.source).id;
    let source = session.view(solidity.current.source).source;
    await session.addBreakpoint({
      sourceId,
      line: lineOf("BREAK LIBRARY", source)
    });
    await session.continueUntilBreakpoint();

    const variables = TruffleDecodeUtils.Conversion.cleanBNs(
      await session.variables()
    );

    assert.equal(variables.this, variables.__this);
    assert.deepEqual(variables.msg, variables.__msg);
    assert.deepEqual(variables.tx, variables.__tx);
    assert.deepEqual(variables.block, variables.__block);
    assert.equal(variables.now, variables.__now);
  });

  it("Gets globals correctly in simple creation", async function() {
    this.skip();
    this.timeout(8000);
    let contract = await abstractions.CreationTest.new(9, { value: 100 });
    let txHash = contract.transactionHash;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      files,
      contracts: artifacts
    });

    let session = bugger.connect();

    await session.continueUntilBreakpoint(); //run till end

    const variables = TruffleDecodeUtils.Conversion.cleanBNs(
      await session.variables()
    );

    assert.equal(variables.this, variables._this);
    assert.deepEqual(variables.msg, variables._msg);
    assert.deepEqual(variables.tx, variables._tx);
    assert.deepEqual(variables.block, variables._block);
    assert.equal(variables.now, variables._now);
  });

  it("Gets globals correctly in nested creation", async function() {
    this.skip();
    this.timeout(8000);
    let instance = await abstractions.GlobalTest.deployed();
    let receipt = await instance.runCreate(9, { value: 100 });
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      files,
      contracts: artifacts
    });

    let session = bugger.connect();

    let sourceId = session.view(solidity.current.source).id;
    let source = session.view(solidity.current.source).source;
    await session.addBreakpoint({
      sourceId,
      line: lineOf("BREAK CREATE", source)
    });
    await session.continueUntilBreakpoint();

    const variables = TruffleDecodeUtils.Conversion.cleanBNs(
      await session.variables()
    );

    assert.equal(variables.this, variables._this);
    assert.deepEqual(variables.msg, variables._msg);
    assert.deepEqual(variables.tx, variables._tx);
    assert.deepEqual(variables.block, variables._block);
    assert.equal(variables.now, variables._now);
  });
});
