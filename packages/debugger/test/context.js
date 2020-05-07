import debugModule from "debug";
const debug = debugModule("test:context");

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts } from "./helpers";
import Debugger from "lib/debugger";

import sessionSelector from "lib/session/selectors";

const __OUTER = `
pragma solidity ^0.6.1;

import "./InnerContract.sol";

contract OuterContract {
  event Outer();

  InnerContract inner;

  constructor(address _inner) public {
    inner = InnerContract(_inner);
  }

  function run() public {
    inner.run();

    emit Outer();
  }
}
`;

const __INNER = `
pragma solidity ^0.6.1;

contract InnerContract {
  event Inner();

  function run() public {
    emit Inner();
  }
}
`;

const __IMMUTABLE = `
pragma solidity ^0.6.5;

contract ImmutableTest {
  uint immutable x = 35;
  function run() public {
    TestLibrary.shout(x);
  }
}

library TestLibrary {
  event Shout(uint);
  function shout(uint x) external {
    emit Shout(x);
  }
}
`;

const __MIGRATION = `
let OuterContract = artifacts.require("OuterContract");
let InnerContract = artifacts.require("InnerContract");
let ImmutableTest = artifacts.require("ImmutableTest");
let TestLibrary = artifacts.require("TestLibrary");

module.exports = async function(deployer) {
  await deployer.deploy(InnerContract);
  const inner = await InnerContract.deployed();
  await deployer.deploy(OuterContract, inner.address);
  await deployer.deploy(TestLibrary);
  await deployer.link(TestLibrary, ImmutableTest);
  await deployer.deploy(ImmutableTest);
};
`;

let migrations = {
  "2_deploy_contracts.js": __MIGRATION
};

let sources = {
  "OuterLibrary.sol": __OUTER,
  "InnerContract.sol": __INNER,
  "ImmutableTest.sol": __IMMUTABLE
};

describe("Contexts", function() {
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

  it("returns view of addresses affected", async function() {
    let outer = await abstractions.OuterContract.deployed();
    let inner = await abstractions.InnerContract.deployed();

    // run outer contract method
    let result = await outer.run();

    assert.lengthOf(result.receipt.rawLogs, 2, "There should be two logs");

    let txHash = result.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });
    debug("debugger ready");

    let affectedInstances = bugger.view(sessionSelector.info.affectedInstances);
    debug("affectedInstances: %o", affectedInstances);

    let affectedAddresses = Object.keys(affectedInstances);

    assert.equal(affectedAddresses.length, 2);

    assert.include(
      affectedAddresses,
      outer.address,
      "OuterContract should be an affected address"
    );

    assert.include(
      affectedAddresses,
      inner.address,
      "InnerContract should be an affected address"
    );
  });

  it("correctly identifies context in presence of libraries and immutables", async function() {
    let ImmutableTest = await abstractions.ImmutableTest.deployed();
    let address = ImmutableTest.address;
    let TestLibrary = await abstractions.TestLibrary.deployed();
    let libraryAddress = TestLibrary.address;

    // run outer contract method
    let result = await ImmutableTest.run();

    let txHash = result.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });
    debug("debugger ready");

    let affectedInstances = bugger.view(sessionSelector.info.affectedInstances);
    debug("affectedInstances: %o", affectedInstances);

    assert.property(affectedInstances, address);
    assert.equal(affectedInstances[address].contractName, "ImmutableTest");
    assert.property(affectedInstances, libraryAddress);
    assert.equal(affectedInstances[libraryAddress].contractName, "TestLibrary");
  });
});
