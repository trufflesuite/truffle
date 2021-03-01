import debugModule from "debug";
const debug = debugModule("debugger:test:data:ids");

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts, lineOf } from "../helpers";
import Debugger from "lib/debugger";

import trace from "lib/trace/selectors";
import solidity from "lib/solidity/selectors";
import * as Codec from "@truffle/codec";

const __FACTORIAL = `
pragma solidity ^0.8.0;

contract FactorialTest {

  uint lastResult;

  function factorial(uint n) public returns(uint nbang) {
    uint prevFac;
    nbang = n;
    lastResult = nbang; //break here #1
    if (n > 0) {
      uint prev = n - 1;
      prevFac = factorial(n - 1);
      nbang = n * prevFac;
    } else {
      nbang = 1;
    }
    lastResult = nbang; //break here #2
  }
}
`;

const __ADDRESS = `
pragma solidity ^0.8.0;

contract AddressTest {

  uint8 x;
  uint8 y;
  uint8 result;

  function run() public {
    SecretByte test1 = new SecretByte(107);
    SecretByte test2 = new SecretByte(46);
    x = test1.mangle();
    y = test2.mangle();
  }
}

contract SecretByte {

  uint8 private secret;

  constructor(uint8 n) {
    secret = n;
  }

  function mangle() public view returns (uint8) {
    uint8 mangled;
    mangled = secret + 1;

    return mangled; //break here (32)

  }
}
`;

const __INTERVENING = `
pragma solidity ^0.8.0;

import "./InterveningLib.sol";

contract Intervening {

  Inner inner;

  constructor(address _inner) {
    inner = Inner(_inner);
  }

  function run() public {
    uint8 flag;
    flag = 0;
    inner.run();

    flag = 1; //break here #1 (18)

  }

  function runLib() public {
    uint8 flag;
    flag = 0;
    flag = InterveningLib.run();

    flag = 1; //break here #2 (27)

  }
}

contract Inner {

  uint8 flag;

  constructor() {
    flag = 0;
  }

  function run() public returns (uint8) {
    flag = 1;
    return 2;
  }
}

`;

const __INTERVENINGLIB = `
pragma solidity ^0.8.0;

library InterveningLib {

  function run() pure external returns (uint8) {
    return 2;
  }
}
`;

const __MODIFIERS = `
pragma solidity ^0.8.0;

contract ModifierTest {

  event Echo(uint);

  modifier modifiedBy(uint x) {
    uint temp = x + 1;
    emit Echo(temp); //BREAK HERE #1
    _;
    emit Echo(temp); //BREAK HERE #2
  }

  function run() public modifiedBy(3) modifiedBy(5) {
  }
}
`;

const __MIGRATION = `
let Intervening = artifacts.require("Intervening");
let Inner = artifacts.require("Inner");
let AddressTest = artifacts.require("AddressTest");
let FactorialTest = artifacts.require("FactorialTest");
let InterveningLib = artifacts.require("InterveningLib");
let ModifierTest = artifacts.require("ModifierTest");

module.exports = async function(deployer) {
  await deployer.deploy(InterveningLib);
  await deployer.deploy(Inner);
  const inner = await Inner.deployed();
  await deployer.link(InterveningLib, Intervening);
  await deployer.deploy(Intervening, inner.address);
  await deployer.deploy(AddressTest);
  await deployer.deploy(FactorialTest);
  await deployer.deploy(ModifierTest);
};
`;

let sources = {
  "FactorialTest.sol": __FACTORIAL,
  "AddressTest.sol": __ADDRESS,
  "Intervening.sol": __INTERVENING,
  "InterveningLib.sol": __INTERVENINGLIB,
  "ModifierTest.sol": __MODIFIERS
};

let migrations = {
  "2_deploy_contracts.js": __MIGRATION
};

describe("Variable IDs", function () {
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

  it("Distinguishes between stackframes", async function () {
    this.timeout(8000);
    let instance = await abstractions.FactorialTest.deployed();
    let receipt = await instance.factorial(3);
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    debug("sourceId %d", bugger.view(solidity.current.source).id);

    let sourceId = bugger.view(solidity.current.source).id;
    let source = bugger.view(solidity.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("break here #1", source)
    });
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("break here #2", source)
    });

    var values = [];

    await bugger.continueUntilBreakpoint();
    while (!bugger.view(trace.finished)) {
      values.push(
        Codec.Format.Utils.Inspect.unsafeNativize(await bugger.variable("nbang"))
      );
      await bugger.continueUntilBreakpoint();
    }

    assert.deepEqual(values, [3, 2, 1, 0, 1, 1, 2, 6]);
  });

  it("Distinguishes between modifier invocations", async function () {
    this.timeout(8000);
    let instance = await abstractions.ModifierTest.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    debug("sourceId %d", bugger.view(solidity.current.source).id);

    let sourceId = bugger.view(solidity.current.source).id;
    let source = bugger.view(solidity.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("BREAK HERE #1", source)
    });
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("BREAK HERE #2", source)
    });

    var xValues = [];
    var tempValues = [];

    await bugger.continueUntilBreakpoint();
    while (!bugger.view(trace.finished)) {
      xValues.push(
        Codec.Format.Utils.Inspect.unsafeNativize(await bugger.variable("x"))
      );
      tempValues.push(
        Codec.Format.Utils.Inspect.unsafeNativize(await bugger.variable("temp"))
      );
      await bugger.continueUntilBreakpoint();
    }

    assert.deepEqual(xValues, [3, 5, 5, 3]);
    assert.deepEqual(tempValues, [4, 6, 6, 4]);
  });

  it("Stays at correct stackframe after contract call", async function () {
    this.timeout(3000);
    let instance = await abstractions.Intervening.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    debug("sourceId %d", bugger.view(solidity.current.source).id);

    let sourceId = bugger.view(solidity.current.source).id;
    let source = bugger.view(solidity.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("break here #1", source)
    });
    await bugger.continueUntilBreakpoint();
    assert.property(await bugger.variables(), "flag");
  });

  it("Stays at correct stackframe after library call", async function () {
    this.timeout(3000);
    let instance = await abstractions.Intervening.deployed();
    let receipt = await instance.runLib();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    debug("sourceId %d", bugger.view(solidity.current.source).id);

    let sourceId = bugger.view(solidity.current.source).id;
    let source = bugger.view(solidity.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("break here #2", source)
    });
    await bugger.continueUntilBreakpoint();
    assert.property(await bugger.variables(), "flag");
  });
});
