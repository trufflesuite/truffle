import assert from "assert";

import Ganache from "ganache-cli";
import Web3 from "web3";

import { prepareContracts } from "./helpers";
import Debugger from "../lib/debugger";

import trace from "../lib/trace/selectors";

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

describe("Debugger", function() {
  var provider;
  var web3;

  before("Create Provider", async function() {
    provider = Ganache.provider({seed: "debugger", gasLimit: 7000000});
    web3 = new Web3(provider);
  });

  it("debugs SimpleStorage", async function() {
    this.timeout(30000);

    let {abstractions, artifacts} = await prepareContracts(provider, {
      "SimpleStorage.sol": __SIMPLE_STORAGE__SOL
    });

    debug("contracts: %O", artifacts);

    let storage = await abstractions.SimpleStorage.deployed();
    let receipt = await storage.set(10);

    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      contracts: artifacts,
      provider: provider
    });
    let session = bugger.connect();

    let max = 100;
    let i = 0;
    while (session.state && i < max) {
      i++;
      session.stepNext();
      debug("steps remaining: %o", session.view(trace.stepsRemaining));
    }
  });



//   it("should have contracts", async function() {
//     let contracts = new TruffleContracts(config);
//     const contexts = await contracts.gatherContexts();
//     debug("contexts: %O", contexts);
//   });


});
