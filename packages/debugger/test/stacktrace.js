import debugModule from "debug";
const debug = debugModule("debugger:test:stacktrace");

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts, lineOf } from "./helpers";
import Debugger from "lib/debugger";

import solidity from "lib/solidity/selectors";
import stacktrace from "lib/stacktrace/selectors";

const __STACKTRACE = `
pragma solidity ^0.8.0;

contract StacktraceTest {

  Boom boom = new Boom();
  event Num(uint);
  function(bool) internal run0;

  function run(uint fnId) public {
    function(bool) internal[4] memory run0s = [
      runRequire, runPay, runInternal, runBoom
    ];
    if(fnId < run0s.length) {
      run0 = run0s[fnId];
      this.run2(true);
      this.run3(false);
    }
    emit Num(1);
  }

  constructor() payable {
  }

  function run3(bool succeed) public {
    run2(succeed);
  }

  function run2(bool succeed) public {
    this.run1(succeed);
  }

  function run1(bool succeed) public {
    run0(succeed); //CALL
  }

  function runRequire(bool succeed) public {
    emit Num(1); //EMIT
    require(succeed); //REQUIRE
  }

  function runPay(bool succeed) public {
    if(!succeed) {
      payable(address(this)).transfer(1); //PAY
    }
  }

  function runBoom(bool succeed) public {
    if(!succeed) {
      emit Num(boom.boom()); //UHOH
    }
  }

  function runInternal(bool succeed) public {
    function() internal garbage;
    if(!succeed) {
      garbage(); //GARBAGE
    }
  }
}

contract Boom {
  function boom() public returns (uint) {
    selfdestruct(payable(address(this))); //BOOM
  }

  receive() external payable{
  }
}
`;

let sources = {
  "StacktraceTest.sol": __STACKTRACE
};

const __MIGRATION = `
let StacktraceTest = artifacts.require("StacktraceTest");

module.exports = function(deployer) {
  deployer.deploy(StacktraceTest, { value: 1 });
};
`;

let migrations = {
  "2_deploy_contracts.js": __MIGRATION
};

describe("Stack tracing", function () {
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

  it("Generates correct stack trace on a revert", async function () {
    this.timeout(12000);
    let instance = await abstractions.StacktraceTest.deployed();
    //HACK: because this transaction fails, we have to extract the hash from
    //the resulting exception (there is supposed to be a non-hacky way but it
    //does not presently work)
    let txHash;
    try {
      await instance.run(0); //this will throw because of the revert
    } catch (error) {
      txHash = error.hashes[0]; //it's the only hash involved
    }

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });

    let source = bugger.view(solidity.current.source);
    let failLine = lineOf("REQUIRE", source.source);
    let callLine = lineOf("CALL", source.source);
    
    await bugger.runToEnd();

    let report = bugger.view(stacktrace.current.finalReport);
    let functionNames = report.map(({ functionName }) => functionName);
    assert.deepEqual(functionNames, [
      undefined,
      "run",
      undefined,
      "run3",
      "run2",
      undefined,
      "run1",
      "runRequire"
    ]);
    let contractNames = report.map(({ contractName }) => contractName);
    assert(contractNames.every(name => name === "StacktraceTest"));
    let addresses = report.map(({ address }) => address);
    assert(addresses.every(address => address === instance.address));
    let status = report[report.length - 1].status;
    assert.isFalse(status);
    let location = report[report.length - 1].location;
    let prevLocation = report[report.length - 2].location;
    assert.strictEqual(location.sourceRange.lines.start.line, failLine);
    assert.strictEqual(prevLocation.sourceRange.lines.start.line, callLine);
  });

  it("Generates correct stack trace at an intermediate state", async function () {
    this.timeout(12000);
    let instance = await abstractions.StacktraceTest.deployed();
    //HACK: because this transaction fails, we have to extract the hash from
    //the resulting exception (there is supposed to be a non-hacky way but it
    //does not presently work)
    let txHash;
    try {
      await instance.run(0); //this will throw because of the revert
    } catch (error) {
      txHash = error.hashes[0]; //it's the only hash involved
    }

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });

    let source = bugger.view(solidity.current.source);
    let breakLine = lineOf("EMIT", source.source);
    let callLine = lineOf("CALL", source.source);
    let breakpoint = {
      sourceId: source.id,
      line: breakLine
    };
    await bugger.addBreakpoint(breakpoint);
    await bugger.continueUntilBreakpoint(); //run till EMIT

    let report = bugger.view(stacktrace.current.report);
    let functionNames = report.map(({ functionName }) => functionName);
    assert.deepEqual(functionNames, [
      undefined,
      "run",
      undefined,
      "run2",
      undefined,
      "run1",
      "runRequire"
    ]);
    let contractNames = report.map(({ contractName }) => contractName);
    assert(contractNames.every(name => name === "StacktraceTest"));
    let addresses = report.map(({ address }) => address);
    assert(addresses.every(address => address === instance.address));
    let status = report[report.length - 1].status;
    assert.isUndefined(status);
    let location = report[report.length - 1].location;
    let prevLocation = report[report.length - 2].location;
    assert.strictEqual(location.sourceRange.lines.start.line, breakLine);
    assert.strictEqual(prevLocation.sourceRange.lines.start.line, callLine);

    await bugger.continueUntilBreakpoint(); //run till EMIT again

    report = bugger.view(stacktrace.current.report);
    functionNames = report.map(({ functionName }) => functionName);
    assert.deepEqual(functionNames, [
      undefined,
      "run",
      undefined,
      "run3",
      "run2",
      undefined,
      "run1",
      "runRequire"
    ]);
    contractNames = report.map(({ contractName }) => contractName);
    assert(contractNames.every(name => name === "StacktraceTest"));
    addresses = report.map(({ address }) => address);
    assert(addresses.every(address => address === instance.address));
    status = report[report.length - 1].status;
    assert.isUndefined(status);
    location = report[report.length - 1].location;
    prevLocation = report[report.length - 2].location;
    assert.strictEqual(location.sourceRange.lines.start.line, breakLine);
    assert.strictEqual(prevLocation.sourceRange.lines.start.line, callLine);
  });

  it("Generates correct stack trace on paying an unpayable contract", async function () {
    this.timeout(12000);
    let instance = await abstractions.StacktraceTest.deployed();
    //HACK: because this transaction fails, we have to extract the hash from
    //the resulting exception (there is supposed to be a non-hacky way but it
    //does not presently work)
    let txHash;
    try {
      await instance.run(1); //this will throw because of the revert
    } catch (error) {
      txHash = error.hashes[0]; //it's the only hash involved
    }

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });

    let source = bugger.view(solidity.current.source);
    let failLine = lineOf("PAY", source.source);
    let callLine = lineOf("CALL", source.source);

    await bugger.runToEnd();

    let report = bugger.view(stacktrace.current.finalReport);
    let functionNames = report.map(({ functionName }) => functionName);
    assert.deepEqual(functionNames, [
      undefined,
      "run",
      undefined,
      "run3",
      "run2",
      undefined,
      "run1",
      "runPay",
      undefined
    ]);
    let contractNames = report.map(({ contractName }) => contractName);
    assert(contractNames.every(name => name === "StacktraceTest"));
    let addresses = report.map(({ address }) => address);
    assert(addresses.every(address => address === instance.address));
    let status = report[report.length - 1].status;
    assert.isFalse(status);
    let location = report[report.length - 2].location; //note, -2 because of undefined on top
    let prevLocation = report[report.length - 3].location; //similar
    assert.strictEqual(location.sourceRange.lines.start.line, failLine);
    assert.strictEqual(prevLocation.sourceRange.lines.start.line, callLine);
  });

  it("Generates correct stack trace on calling an invalid internal function", async function () {
    this.timeout(12000);
    let instance = await abstractions.StacktraceTest.deployed();
    //HACK: because this transaction fails, we have to extract the hash from
    //the resulting exception (there is supposed to be a non-hacky way but it
    //does not presently work)
    let txHash;
    try {
      await instance.run(2); //this will throw because of the revert
    } catch (error) {
      txHash = error.hashes[0]; //it's the only hash involved
    }

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });

    let source = bugger.view(solidity.current.source);
    let failLine = lineOf("GARBAGE", source.source);
    let callLine = lineOf("CALL", source.source);

    await bugger.runToEnd();

    let report = bugger.view(stacktrace.current.finalReport);
    let functionNames = report.map(({ functionName }) => functionName);
    assert.deepEqual(functionNames, [
      undefined,
      "run",
      undefined,
      "run3",
      "run2",
      undefined,
      "run1",
      "runInternal",
      undefined,
      "panic_error_0x51"
    ]);
    let contractNames = report.map(({ contractName }) => contractName);
    assert.isUndefined(contractNames[contractNames.length - 1]);
    assert.isUndefined(contractNames[contractNames.length - 2]);
    assert(contractNames.slice(0,-2).every(name => name === "StacktraceTest"));
    let addresses = report.map(({ address }) => address);
    assert(addresses.every(address => address === instance.address));
    let status = report[report.length - 1].status;
    assert.isFalse(status);
    let location = report[report.length - 3].location; //note, -2 because of panic & undefined on top
    let prevLocation = report[report.length - 4].location; //similar
    assert.strictEqual(location.sourceRange.lines.start.line, failLine);
    assert.strictEqual(prevLocation.sourceRange.lines.start.line, callLine);
  });

  it("Generates correct stack trace on unexpected self-destruct", async function () {
    this.timeout(12000);
    let instance = await abstractions.StacktraceTest.deployed();
    //HACK: because this transaction fails, we have to extract the hash from
    //the resulting exception (there is supposed to be a non-hacky way but it
    //does not presently work)
    let txHash;
    try {
      await instance.run(3); //this will throw because of the revert
    } catch (error) {
      txHash = error.hashes[0]; //it's the only hash involved
    }

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });

    let source = bugger.view(solidity.current.source);
    let failLine = lineOf("BOOM", source.source);
    let callLine = lineOf("UHOH", source.source);
    let prevCallLine = lineOf("CALL", source.source);

    await bugger.runToEnd();

    let report = bugger.view(stacktrace.current.finalReport);
    let functionNames = report.map(({ functionName }) => functionName);
    assert.deepEqual(functionNames, [
      undefined,
      "run",
      undefined,
      "run3",
      "run2",
      undefined,
      "run1",
      "runBoom",
      undefined,
      "boom"
    ]);
    let contractNames = report.map(({ contractName }) => contractName);
    assert.strictEqual(contractNames[contractNames.length - 1], "Boom");
    contractNames.pop(); //top frame
    assert.strictEqual(contractNames[contractNames.length - 1], "Boom");
    contractNames.pop(); //second-top frame
    assert(contractNames.every(name => name === "StacktraceTest"));
    let addresses = report.map(({ address }) => address);
    assert.strictEqual(
      addresses[addresses.length - 1],
      addresses[addresses.length - 2]
    );
    addresses.pop();
    addresses.pop();
    assert(addresses.every(address => address === instance.address));
    let status = report[report.length - 1].status;
    assert.isTrue(status);
    let location = report[report.length - 1].location;
    //skip a frame for the junk frame
    let prevLocation = report[report.length - 3].location;
    let prev2Location = report[report.length - 4].location;
    assert.strictEqual(location.sourceRange.lines.start.line, failLine);
    assert.strictEqual(prevLocation.sourceRange.lines.start.line, callLine);
    assert.strictEqual(
      prev2Location.sourceRange.lines.start.line,
      prevCallLine
    );
  });
});
