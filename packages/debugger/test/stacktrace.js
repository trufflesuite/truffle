import debugModule from "debug";
const debug = debugModule("debugger:test:stacktrace");

import { assert } from "chai";

import Ganache from "ganache";

import {
  prepareContracts,
  lineOf,
  testBlockGasLimit,
  testDefaultTxGasLimit
} from "./helpers";
import Debugger from "lib/debugger";

import sourcemapping from "lib/sourcemapping/selectors";
import stacktrace from "lib/stacktrace/selectors";

const __STACKTRACE = `
pragma solidity ^0.8.0;

contract StacktraceTest {

  Boom boom = new Boom();
  event Num(uint);
  function(bool) internal run0;

  function run(uint fnId) public {
    function(bool) internal[7] memory run0s = [
      runRequire, runPay, runInternal, runBoom,
      runCreate, runFallback, runLib
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
    require(succeed, "requirement failed"); //REQUIRE
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

  function runCreate(bool succeed) public {
    if(!succeed) {
      new CantCreate{salt: 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef}();
      //passing a salt here so it'll use CREATE2 and we can get an actual address
    }
  }

  fallback() external {
    fail(); //CANTFALLBACK
  }

  error CustomFailure();

  function fail() public {
    revert CustomFailure(); //FALLBACKFAIL
  }

  function runFallback(bool succeed) public {
    if(!succeed) {
      Boom(payable(address(this))).boom(); //this function doesn't exist, so it'll hit fallback
    }
  }

  function runLib(bool succeed) public {
    if(!succeed) {
      Library.outerFail();
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

contract CantCreate {
  constructor() {
    fail(); //CANTCREATE
  }

  function fail() public {
    revert("Nope!"); //CREATEFAIL
  }
}

library Library {
  function outerFail() external {
    innerFail(); //CANTLIB
  }

  function innerFail() internal {
    revert("Nope!"); //LIBFAIL
  }
}
`;

const sources = {
  "StacktraceTest.sol": __STACKTRACE
};

const __MIGRATION = `
const StacktraceTest = artifacts.require("StacktraceTest");
const Library = artifacts.require("Library");

module.exports = async function(deployer) {
  await deployer.deploy(Library);
  await deployer.link(Library, StacktraceTest);
  await deployer.deploy(StacktraceTest, { value: 1 });
};
`;

const migrations = {
  "2_deploy_contracts.js": __MIGRATION
};

describe("Stack tracing", function () {
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

  it("Generates correct stack trace on a revert", async function () {
    this.timeout(12000);
    let instance = await abstractions.StacktraceTest.deployed();
    //HACK: because this transaction fails, we have to extract the hash from
    //the resulting exception (there is supposed to be a non-hacky way but it
    //does not presently work)
    let txHash;
    try {
      await instance.run(0, { gas: testDefaultTxGasLimit }); //this will throw because of the revert
    } catch (error) {
      txHash = error.receipt.transactionHash;
    }
    assert.isDefined(txHash, "should have errored and set txHash");

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });

    let source = bugger.view(sourcemapping.current.source);
    let failLine = lineOf("REQUIRE", source.source);
    let callLine = lineOf("CALL", source.source);

    await bugger.runToEnd();

    let report = bugger.view(stacktrace.current.finalReport);
    let functionNames = report.map(({ functionName }) => functionName);
    assert.deepEqual(functionNames, [
      "run",
      "run3",
      "run2",
      "run1",
      "runRequire"
    ]);
    let contractNames = report.map(({ contractName }) => contractName);
    assert(contractNames.every(name => name === "StacktraceTest"));
    let addresses = report.map(({ address }) => address);
    assert(addresses.every(address => address === instance.address));
    assert(report.every(({ isConstructor }) => !isConstructor));
    let status = report[report.length - 1].status;
    assert.isFalse(status);
    let location = report[report.length - 1].location;
    let prevLocation = report[report.length - 2].location;
    assert.strictEqual(location.sourceRange.lines.start.line, failLine);
    assert.strictEqual(prevLocation.sourceRange.lines.start.line, callLine);
    assert.strictEqual(report[0].message, "requirement failed");
  });

  it("Generates correct stack trace at an intermediate state", async function () {
    this.timeout(12000);
    let instance = await abstractions.StacktraceTest.deployed();
    //HACK: because this transaction fails, we have to extract the hash from
    //the resulting exception (there is supposed to be a non-hacky way but it
    //does not presently work)
    let txHash;
    try {
      await instance.run(0, { gas: testDefaultTxGasLimit }); //this will throw because of the revert
    } catch (error) {
      txHash = error.receipt.transactionHash;
    }
    assert.isDefined(txHash, "should have errored and set txHash");

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });

    let source = bugger.view(sourcemapping.current.source);
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
    assert.deepEqual(functionNames, ["run", "run2", "run1", "runRequire"]);
    let contractNames = report.map(({ contractName }) => contractName);
    assert(contractNames.every(name => name === "StacktraceTest"));
    let addresses = report.map(({ address }) => address);
    assert(addresses.every(address => address === instance.address));
    assert(report.every(({ isConstructor }) => !isConstructor));
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
      "run",
      "run3",
      "run2",
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
      await instance.run(1, { gas: testDefaultTxGasLimit }); //this will throw because of the revert
    } catch (error) {
      txHash = error.receipt.transactionHash;
    }
    assert.isDefined(txHash, "should have errored and set txHash");

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });

    let source = bugger.view(sourcemapping.current.source);
    let failLine = lineOf("PAY", source.source);
    let callLine = lineOf("CALL", source.source);

    await bugger.runToEnd();

    let report = bugger.view(stacktrace.current.finalReport);
    let functionNames = report.map(({ functionName }) => functionName);
    assert.deepEqual(functionNames, [
      "run",
      "run3",
      "run2",
      "run1",
      "runPay",
      undefined
    ]);
    let contractNames = report.map(({ contractName }) => contractName);
    assert(contractNames.every(name => name === "StacktraceTest"));
    let addresses = report.map(({ address }) => address);
    assert(addresses.every(address => address === instance.address));
    assert(report.every(({ isConstructor }) => !isConstructor));
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
      await instance.run(2, { gas: testDefaultTxGasLimit }); //this will throw because of the revert
    } catch (error) {
      txHash = error.receipt.transactionHash;
    }
    assert.isDefined(txHash, "should have errored and set txHash");

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });

    let source = bugger.view(sourcemapping.current.source);
    let failLine = lineOf("GARBAGE", source.source);
    let callLine = lineOf("CALL", source.source);

    await bugger.runToEnd();

    let report = bugger.view(stacktrace.current.finalReport);
    let functionNames = report.map(({ functionName }) => functionName);
    assert.deepEqual(functionNames, [
      "run",
      "run3",
      "run2",
      "run1",
      "runInternal",
      undefined,
      "panic_error_0x51"
    ]);
    let contractNames = report.map(({ contractName }) => contractName);
    assert.isUndefined(contractNames[contractNames.length - 1]);
    assert.isUndefined(contractNames[contractNames.length - 2]);
    assert(contractNames.slice(0, -2).every(name => name === "StacktraceTest"));
    let addresses = report.map(({ address }) => address);
    assert(addresses.every(address => address === instance.address));
    assert(report.every(({ isConstructor }) => !isConstructor));
    let status = report[report.length - 1].status;
    assert.isFalse(status);
    let location = report[report.length - 3].location; //note, -3 because of panic & undefined on top
    let prevLocation = report[report.length - 4].location; //similar
    assert.strictEqual(location.sourceRange.lines.start.line, failLine);
    assert.strictEqual(prevLocation.sourceRange.lines.start.line, callLine);
    assert.strictEqual(report[0].panic.toNumber(), 0x51);
  });

  it("Generates correct stack trace on unexpected self-destruct", async function () {
    this.timeout(12000);
    let instance = await abstractions.StacktraceTest.deployed();
    //HACK: because this transaction fails, we have to extract the hash from
    //the resulting exception (there is supposed to be a non-hacky way but it
    //does not presently work)
    let txHash;
    try {
      await instance.run(3, { gas: testDefaultTxGasLimit }); //this will throw because of the revert
    } catch (error) {
      txHash = error.receipt.transactionHash;
    }
    assert.isDefined(txHash, "should have errored and set txHash");

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });

    let source = bugger.view(sourcemapping.current.source);
    let failLine = lineOf("BOOM", source.source);
    let callLine = lineOf("UHOH", source.source);
    let prevCallLine = lineOf("CALL", source.source);

    await bugger.runToEnd();

    let report = bugger.view(stacktrace.current.finalReport);
    let functionNames = report.map(({ functionName }) => functionName);
    assert.deepEqual(functionNames, [
      "run",
      "run3",
      "run2",
      "run1",
      "runBoom",
      "boom"
    ]);
    let contractNames = report.map(({ contractName }) => contractName);
    assert.strictEqual(contractNames[contractNames.length - 1], "Boom");
    contractNames.pop(); //top frame
    assert(contractNames.every(name => name === "StacktraceTest"));
    let addresses = report.map(({ address }) => address);
    assert.notEqual(
      //check that Boom and StacktraceTest are not same address
      addresses[addresses.length - 1],
      addresses[addresses.length - 2]
    );
    addresses.pop();
    assert(addresses.every(address => address === instance.address));
    assert(report.every(({ isConstructor }) => !isConstructor));
    let status = report[report.length - 1].status;
    assert.isTrue(status);
    let location = report[report.length - 1].location;
    let prevLocation = report[report.length - 2].location;
    let prev2Location = report[report.length - 3].location;
    assert.strictEqual(location.sourceRange.lines.start.line, failLine);
    assert.strictEqual(prevLocation.sourceRange.lines.start.line, callLine);
    assert.strictEqual(
      prev2Location.sourceRange.lines.start.line,
      prevCallLine
    );
  });

  it("Generates correct stack trace after an internal call in a constructor", async function () {
    this.timeout(12000);
    let instance = await abstractions.StacktraceTest.deployed();
    //HACK: because this transaction fails, we have to extract the hash from
    //the resulting exception (there is supposed to be a non-hacky way but it
    //does not presently work)
    let txHash;
    try {
      await instance.run(4, { gas: testDefaultTxGasLimit }); //this will throw because of the revert
    } catch (error) {
      txHash = error.receipt.transactionHash;
    }
    assert.isDefined(txHash, "should have errored and set txHash");

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });

    let source = bugger.view(sourcemapping.current.source);
    let failLine = lineOf("CREATEFAIL", source.source);
    let callLine = lineOf("CANTCREATE", source.source);

    await bugger.runToEnd();

    let report = bugger.view(stacktrace.current.finalReport);
    let functionNames = report.map(({ functionName }) => functionName);
    assert.deepEqual(functionNames, [
      "run",
      "run3",
      "run2",
      "run1",
      "runCreate",
      undefined,
      "fail"
    ]);
    let contractNames = report.map(({ contractName }) => contractName);
    assert.strictEqual(contractNames[contractNames.length - 1], "CantCreate");
    contractNames.pop(); //top frame
    assert.strictEqual(contractNames[contractNames.length - 1], "CantCreate");
    contractNames.pop(); //second-to-top frame
    assert(contractNames.every(name => name === "StacktraceTest"));
    let addresses = report.map(({ address }) => address);
    assert.strictEqual(
      //top two frames should both be CantCreate
      addresses[addresses.length - 1],
      addresses[addresses.length - 2]
    );
    addresses = addresses.slice(0, -2); //cut off top two frames that we just checked
    assert(addresses.every(address => address === instance.address));
    let isConstructorArray = report.map(({ isConstructor }) => isConstructor);
    assert.isTrue(isConstructorArray[isConstructorArray.length - 1]);
    isConstructorArray.pop(); //top frame
    assert.isTrue(isConstructorArray[isConstructorArray.length - 1]);
    isConstructorArray.pop(); //second-to-top frame
    assert(isConstructorArray.every(isConstructor => !isConstructor));
    let status = report[report.length - 1].status;
    assert.isFalse(status);
    let location = report[report.length - 1].location;
    let prevLocation = report[report.length - 2].location;
    assert.strictEqual(
      location.sourceRange.lines.start.line,
      failLine,
      "wrong final line"
    );
    assert.strictEqual(
      prevLocation.sourceRange.lines.start.line,
      callLine,
      "wrong call line"
    );
    assert.strictEqual(report[0].message, "Nope!");
  });

  it("Generates correct stack trace after an internal call in a fallback function", async function () {
    this.timeout(12000);
    let instance = await abstractions.StacktraceTest.deployed();
    //HACK: because this transaction fails, we have to extract the hash from
    //the resulting exception (there is supposed to be a non-hacky way but it
    //does not presently work)
    let txHash;
    try {
      await instance.run(5, { gas: testDefaultTxGasLimit }); //this will throw because of the revert
    } catch (error) {
      txHash = error.receipt.transactionHash;
    }
    assert.isDefined(txHash, "should have errored and set txHash");

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });

    let source = bugger.view(sourcemapping.current.source);
    let failLine = lineOf("FALLBACKFAIL", source.source);
    let callLine = lineOf("CANTFALLBACK", source.source);

    await bugger.runToEnd();

    let report = bugger.view(stacktrace.current.finalReport);
    let functionNames = report.map(({ functionName }) => functionName);
    assert.deepEqual(functionNames, [
      "run",
      "run3",
      "run2",
      "run1",
      "runFallback",
      undefined,
      "fail"
    ]);
    let contractNames = report.map(({ contractName }) => contractName);
    assert(contractNames.every(name => name === "StacktraceTest"));
    let addresses = report.map(({ address }) => address);
    assert(addresses.every(address => address === instance.address));
    assert(report.every(({ isConstructor }) => !isConstructor));
    let status = report[report.length - 1].status;
    assert.isFalse(status);
    let location = report[report.length - 1].location;
    let prevLocation = report[report.length - 2].location;
    assert.strictEqual(
      location.sourceRange.lines.start.line,
      failLine,
      "wrong final line"
    );
    assert.strictEqual(
      prevLocation.sourceRange.lines.start.line,
      callLine,
      "wrong call line"
    );
    assert.isTrue(report[0].custom);
  });

  it("Generates correct stack trace after an internal call in a library", async function () {
    this.timeout(12000);
    const instance = await abstractions.StacktraceTest.deployed();
    const library = await abstractions.Library.deployed();
    //HACK: because this transaction fails, we have to extract the hash from
    //the resulting exception (there is supposed to be a non-hacky way but it
    //does not presently work)
    let txHash;
    try {
      await instance.run(6, { gas: testDefaultTxGasLimit }); //this will throw because of the revert
    } catch (error) {
      txHash = error.receipt.transactionHash;
    }
    assert.isDefined(txHash, "should have errored and set txHash");

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });

    let source = bugger.view(sourcemapping.current.source);
    let failLine = lineOf("LIBFAIL", source.source);
    let callLine = lineOf("CANTLIB", source.source);

    await bugger.runToEnd();

    let report = bugger.view(stacktrace.current.finalReport);
    let functionNames = report.map(({ functionName }) => functionName);
    assert.deepEqual(functionNames, [
      "run",
      "run3",
      "run2",
      "run1",
      "runLib",
      "outerFail",
      "innerFail"
    ]);
    let contractNames = report.map(({ contractName }) => contractName);
    assert.strictEqual(contractNames[contractNames.length - 1], "Library");
    contractNames.pop(); //top frame
    assert.strictEqual(contractNames[contractNames.length - 1], "Library");
    contractNames.pop(); //second-to-top frame
    assert(
      contractNames.every(name => name === "StacktraceTest"),
      "unexpected remaining names"
    );
    let addresses = report.map(({ address }) => address);
    assert.strictEqual(addresses[addresses.length - 1], library.address);
    addresses.pop(); //top frame
    assert.strictEqual(addresses[addresses.length - 1], library.address);
    addresses.pop(); //second-to-top frame
    assert(
      addresses.every(address => address === instance.address),
      "unexpected remaining addresses"
    );
    assert(report.every(({ isConstructor }) => !isConstructor));
    let status = report[report.length - 1].status;
    assert.isFalse(status);
    let location = report[report.length - 1].location;
    let prevLocation = report[report.length - 2].location;
    assert.strictEqual(location.sourceRange.lines.start.line, failLine);
    assert.strictEqual(prevLocation.sourceRange.lines.start.line, callLine);
    assert.strictEqual(report[0].message, "Nope!");
  });
});
