import debugModule from "debug";
const debug = debugModule("test:context");

import { assert } from "chai";

import Ganache from "ganache-cli";
import Web3 from "web3";

import { prepareContracts } from "./helpers";
import Debugger from "lib/debugger";

import sessionSelector from "lib/session/selectors";
import trace from "lib/trace/selectors";

const __OUTER = `
pragma solidity ^0.4.18;

import "./InnerContract.sol";

contract OuterContract {
  event Outer();

  InnerContract inner;

  function OuterContract(address _inner) public {
    inner = InnerContract(_inner);
  }

  function run() public {
    inner.run();

    Outer();
  }
}
`;

const __INNER = `
pragma solidity ^0.4.18;

contract InnerContract {
  event Inner();

  function run() public {
    Inner();
  }
}
`;

const __MIGRATION = `
let OuterContract = artifacts.require("OuterContract");
let InnerContract = artifacts.require("InnerContract");

module.exports = function(deployer) {
  return deployer
    .then(function() {
      return deployer.deploy(InnerContract);
    })
    .then(function() {
      return InnerContract.deployed();
    })
    .then(function(inner) {
      return deployer.deploy(OuterContract, inner.address);
    });
};
`;

let migrations = {
  "2_deploy_contracts.js": __MIGRATION,
};

let sources = {
  "OuterLibrary.sol": __OUTER,
  "InnerContract.sol": __INNER,
};


describe("Contexts", function () {
  var provider;
  var web3;

  var abstractions;
  var artifacts;

  before("Create Provider", async function() {
    provider = Ganache.provider({seed: "debugger", gasLimit: 7000000});
    web3 = new Web3(provider);
  });

  before("Prepare contracts and artifacts", async function() {
    this.timeout(30000);

    let prepared = await prepareContracts(provider, sources, migrations);
    abstractions = prepared.abstractions;
    artifacts = prepared.artifacts;
  });

  it("returns view of addresses affected", async function () {
    let outer = await abstractions.OuterContract.deployed();
    let inner = await abstractions.InnerContract.deployed();

    // run outer contract method
    let result = await outer.run();

    assert.equal(2, result.receipt.logs.length, "There should be two logs");

    let txHash = result.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      contracts: artifacts
    });
    debug("debugger ready");

    let session = bugger.connect();

    let affectedInstances = session.view(sessionSelector.info.affectedInstances);
    debug("affectedInstances: %o", affectedInstances);

    let affectedAddresses = Object.keys(affectedInstances);

    assert.equal(2, affectedAddresses.length);

    assert.include(
      affectedAddresses, outer.address,
      "OuterContract should be an affected address"
    );

    assert.include(
      affectedAddresses, inner.address,
      "InnerContract should be an affected address"
    );
  });
});
