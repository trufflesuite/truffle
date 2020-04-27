import debugModule from "debug";
const debug = debugModule("test:data:global");

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts, lineOf } from "../helpers";
import Debugger from "lib/debugger";

import * as Codec from "@truffle/codec";

import solidity from "lib/solidity/selectors";

const __GLOBAL = `
pragma solidity ^0.6.2;

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
    this.run{value: msg.value / 2}(x);
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
    new CreationTest{value: msg.value / 2}(x, true);
  }

  function runFailedCreate2(uint x) public payable {
    try new CreationTest{
      value: msg.value / 2,
      salt: 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
    }(x, false) {
    } catch (bytes memory) {
    }
  }
}

contract CreationTest {
  GlobalTest.Msg _msg;
  GlobalTest.Tx _tx;
  GlobalTest.Block _block;
  CreationTest _this;
  uint _now;

  event Done(uint x);

  constructor(uint x, bool succeed) public payable {
    _this = this;
    _now = now;
    _msg = GlobalTest.Msg(msg.data, msg.sender, msg.sig, msg.value);
    _tx = GlobalTest.Tx(tx.origin, tx.gasprice);
    _block = GlobalTest.Block(block.coinbase, block.difficulty,
      block.gaslimit, block.number, block.timestamp);
    require(succeed); //BREAK CREATE
    emit Done(x);
  }
}

library GlobalTestLib {

  event Done(uint x);

  function run(uint x) external {
    GlobalTest.Msg memory __msg;
    GlobalTest.Tx memory __tx;
    GlobalTest.Block memory __block;
    uint __now;
    __now = now;
    __msg = GlobalTest.Msg(msg.data, msg.sender, msg.sig, msg.value);
    __tx = GlobalTest.Tx(tx.origin, tx.gasprice);
    __block = GlobalTest.Block(block.coinbase, block.difficulty,
      block.gaslimit, block.number, block.timestamp);
    emit Done(x + __now + __msg.value + __tx.gasprice + __block.number); //BREAK LIBRARY
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

  it("Gets globals correctly in simple call", async function() {
    this.timeout(8000);
    let instance = await abstractions.GlobalTest.deployed();
    let receipt = await instance.run(9, { value: 100 });
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    await bugger.continueUntilBreakpoint(); //run till end

    const variables = Codec.Format.Utils.Inspect.nativizeVariables(
      await bugger.variables()
    );

    assert.equal(variables.this, variables._this);
    assert.deepEqual(variables.msg, variables._msg);
    assert.deepEqual(variables.tx, variables._tx);
    assert.deepEqual(variables.block, variables._block);
    assert.equal(variables.now, variables._now);
  });

  it("Gets globals correctly in nested call", async function() {
    this.timeout(12000);
    let instance = await abstractions.GlobalTest.deployed();
    let receipt = await instance.runRun(9, { value: 100 });
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let sourceId = bugger.view(solidity.current.source).id;
    let compilationId = bugger.view(solidity.current.source).compilationId;
    let source = bugger.view(solidity.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      compilationId,
      line: lineOf("BREAK SIMPLE", source)
    });
    await bugger.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.nativizeVariables(
      await bugger.variables()
    );

    assert.equal(variables.this, variables._this);
    assert.deepEqual(variables.msg, variables._msg);
    assert.deepEqual(variables.tx, variables._tx);
    assert.deepEqual(variables.block, variables._block);
    assert.equal(variables.now, variables._now);
  });

  it("Gets globals correctly in static call", async function() {
    this.timeout(8000);
    let instance = await abstractions.GlobalTest.deployed();
    let receipt = await instance.runStatic(9);
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let sourceId = bugger.view(solidity.current.source).id;
    let compilationId = bugger.view(solidity.current.source).compilationId;
    let source = bugger.view(solidity.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      compilationId,
      line: lineOf("BREAK STATIC", source)
    });
    await bugger.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.nativizeVariables(
      await bugger.variables()
    );

    assert.equal(variables.this, variables.__this);
    assert.deepEqual(variables.msg, variables.__msg);
    assert.deepEqual(variables.tx, variables.__tx);
    assert.deepEqual(variables.block, variables.__block);
    assert.equal(variables.now, variables.__now);
  });

  it("Gets globals correctly in library call", async function() {
    this.timeout(8000);
    let instance = await abstractions.GlobalTest.deployed();
    let receipt = await instance.runLib(9, { value: 100 });
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let sourceId = bugger.view(solidity.current.source).id;
    let compilationId = bugger.view(solidity.current.source).compilationId;
    let source = bugger.view(solidity.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      compilationId,
      line: lineOf("BREAK LIBRARY", source)
    });
    await bugger.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.nativizeVariables(
      await bugger.variables()
    );

    assert.deepEqual(variables.msg, variables.__msg);
    assert.deepEqual(variables.tx, variables.__tx);
    assert.deepEqual(variables.block, variables.__block);
    assert.equal(variables.now, variables.__now);
  });

  it("Gets globals correctly in simple creation", async function() {
    this.timeout(12000);
    let contract = await abstractions.CreationTest.new(9, { value: 100 });
    let txHash = contract.transactionHash;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    await bugger.continueUntilBreakpoint(); //run till end

    const variables = Codec.Format.Utils.Inspect.nativizeVariables(
      await bugger.variables()
    );

    assert.equal(variables.this, variables._this);
    assert.deepEqual(variables.msg, variables._msg);
    assert.deepEqual(variables.tx, variables._tx);
    assert.deepEqual(variables.block, variables._block);
    assert.equal(variables.now, variables._now);
  });

  it("Gets globals correctly in nested creation", async function() {
    this.timeout(12000);
    let instance = await abstractions.GlobalTest.deployed();
    let receipt = await instance.runCreate(9, { value: 100 });
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let sourceId = bugger.view(solidity.current.source).id;
    let compilationId = bugger.view(solidity.current.source).compilationId;
    let source = bugger.view(solidity.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      compilationId,
      line: lineOf("BREAK CREATE", source)
    });
    await bugger.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.nativizeVariables(
      await bugger.variables()
    );

    assert.equal(variables.this, variables._this);
    assert.deepEqual(variables.msg, variables._msg);
    assert.deepEqual(variables.tx, variables._tx);
    assert.deepEqual(variables.block, variables._block);
    assert.equal(variables.now, variables._now);
  });

  it("Gets globals correctly in failed CREATE2", async function() {
    this.timeout(12000);
    let instance = await abstractions.GlobalTest.deployed();
    let receipt = await instance.runFailedCreate2(9, { value: 100 });
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let sourceId = bugger.view(solidity.current.source).id;
    let compilationId = bugger.view(solidity.current.source).compilationId;
    let source = bugger.view(solidity.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      compilationId,
      line: lineOf("BREAK CREATE", source)
    });
    await bugger.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.nativizeVariables(
      await bugger.variables()
    );

    assert.equal(variables.this, variables._this);
    assert.deepEqual(variables.msg, variables._msg);
    assert.deepEqual(variables.tx, variables._tx);
    assert.deepEqual(variables.block, variables._block);
    assert.equal(variables.now, variables._now);
  });
});
