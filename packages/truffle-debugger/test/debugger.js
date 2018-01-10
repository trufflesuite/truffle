import assert from "assert";

import Ganache from "ganache-cli";
import Web3 from "web3";

import { prepareConfig, gatherContracts } from "./helpers";
import Debugger from "../lib/debugger";

import { currentState } from "../lib/selectors";

let debug = require("debug")("test:debugger");


const __SIMPLE_STORAGE__SOL = `
pragma solidity ^0.4.18;

contract SimpleStorage {
  uint storedData;

  event Set(uint x);

  function set(uint x) public {
    storedData = x;
    triggerEvent();
  }

  function triggerEvent() internal {
    Set(storedData);
  }

  function get() public view returns (uint) {
    return storedData;
  }
}
`;

const __1_MIGRATE_SIMPLE_STORAGE___JS = `
var SimpleStorage = artifacts.require("./SimpleStorage.sol");

module.exports = function(deployer) {
  deployer.deploy(SimpleStorage);
};
`;


describe("Debugger", function() {
  var config;
  var provider;
  var web3;

  before("Create Provider", async function() {
    provider = Ganache.provider({seed: "debugger", gasLimit: 7000000});
    web3 = new Web3(provider);
  });

  it("debugs SimpleStorage", async function() {
    this.timeout(30000);

    let config = await prepareConfig(provider, {
      "SimpleStorage.sol": __SIMPLE_STORAGE__SOL
    }, {
      "1_migrate_simple_storage.js": __1_MIGRATE_SIMPLE_STORAGE___JS
    });

    let contracts = await gatherContracts(config);
    debug("contracts: %O", contracts);

    let SimpleStorage = config.resolver.require("SimpleStorage");

    let storage = await SimpleStorage.deployed();
    let receipt = await storage.set(10);

    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {contracts, web3});
    let session = bugger.connect();

    let max = 20;
    let i = 0;
    while (session.state && i < max) {
      i++;
      session.stepNext();
      debug("steps remaining: %o", session.view(currentState.trace.stepsRemaining));
    }
  });



//   it("should have contracts", async function() {
//     let contracts = new TruffleContracts(config);
//     const contexts = await contracts.gatherContexts();
//     debug("contexts: %O", contexts);
//   });


});
