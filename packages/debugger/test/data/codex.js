import debugModule from "debug";
const debug = debugModule("test:data:codex");

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts } from "../helpers";
import Debugger from "lib/debugger";

const __LIBTEST = `
pragma solidity ^0.5.4;

contract MappingPointerTest {
  mapping(string => uint) surface;

  function run() public {
    TouchLib.touch(surface);
  }
}

library TouchLib {
  function touch(mapping(string => uint) storage surface) external {
    surface["ping"] = 1;
  }
}
`;

const __REVERT_TEST = `
pragma solidity ^0.5.4;

contract RevertTest {

  uint x;
  uint y;

  function() external {
    x = 2;
    y = x;
    revert();
  }

  function run() public {
    x = 1;
    address(this).call(hex"");
  }
}

contract RevertTest2 {

  uint x;
  uint y;

  function() external {
    x = 2;
    y = x;
    assert(false);
  }

  function run() public {
    x = 1;
    address(this).call.gas(gasleft()/2)(hex"");
  }
}
`;

const __MIGRATION = `
var MappingPointerTest = artifacts.require("MappingPointerTest");
var TouchLib = artifacts.require("TouchLib");
var RevertTest = artifacts.require("RevertTest");
var RevertTest2 = artifacts.require("RevertTest2");

module.exports = function(deployer) {
  deployer.deploy(TouchLib);
  deployer.link(TouchLib, MappingPointerTest);
  deployer.deploy(MappingPointerTest);
  deployer.deploy(RevertTest);
  deployer.deploy(RevertTest2);
};
`;

let sources = {
  "MappingPointerTest.sol": __LIBTEST,
  "RevertTest.sol": __REVERT_TEST
};

let migrations = {
  "2_deploy_contracts.js": __MIGRATION
};

describe("Codex", function() {
  var provider;

  var abstractions;
  var artifacts;
  var files;

  before("Create Provider", async function() {
    provider = Ganache.provider({ seed: "debugger", gasLimit: 7000000 });
  });

  before("Prepare contracts and artifacts", async function() {
    this.timeout(30000);

    let prepared = await prepareContracts(provider, sources, migrations);
    abstractions = prepared.abstractions;
    artifacts = prepared.artifacts;
    files = prepared.files;
  });

  it("Tracks storage across call boundaries", async function() {
    this.timeout(6000);
    let instance = await abstractions.MappingPointerTest.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      files,
      contracts: artifacts
    });

    let session = bugger.connect();

    await session.continueUntilBreakpoint(); //run till end

    const variables = await session.variables();

    assert.equal(variables.surface.get("ping").toNumber(), 1);
  });

  it("Reverts storage when a call reverts", async function() {
    this.timeout(6000);
    let instance = await abstractions.RevertTest.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      files,
      contracts: artifacts
    });

    let session = bugger.connect();

    await session.continueUntilBreakpoint(); //run till end

    const variables = await session.variables();

    assert.equal(variables.x.toNumber(), 1);
  });

  it("Reverts storage when a call otherwise fails", async function() {
    this.timeout(6000);
    let instance = await abstractions.RevertTest2.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      files,
      contracts: artifacts
    });

    let session = bugger.connect();

    await session.continueUntilBreakpoint(); //run till end

    const variables = await session.variables();

    assert.equal(variables.x.toNumber(), 1);
  });
});
