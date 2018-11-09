import debugModule from "debug";
const debug = debugModule("test:endstate");

import { assert } from "chai";

import Ganache from "ganache-cli";
import Web3 from "web3";

import { prepareContracts } from "./helpers";
import Debugger from "lib/debugger";

import sessionSelector from "lib/session/selectors";
import data from "lib/data/selectors";

const __FAILURE = `
pragma solidity ^0.4.24;

contract FailureTest {
  function run() {
    revert();
  }
}
`;

const __SUCCESS = `
pragma solidity ^0.4.24;

contract SuccessTest {
uint x;
  function run() {
    x = 107;
  }
}
`;

let sources = {
  "FailureTest.sol": __FAILURE,
  "SuccessTest.sol": __SUCCESS
};

describe("End State", function() {
  var provider;
  var web3;

  var abstractions;
  var artifacts;

  before("Create Provider", async function() {
    provider = Ganache.provider({ seed: "debugger", gasLimit: 7000000 });
    web3 = new Web3(provider);
  });

  before("Prepare contracts and artifacts", async function() {
    this.timeout(30000);

    let prepared = await prepareContracts(provider, sources);
    abstractions = prepared.abstractions;
    artifacts = prepared.artifacts;
  });

  it("correctly marks a failed transaction as failed", async function() {
    let instance = await abstractions.FailureTest.deployed();
    //HACK: because this transaction fails, we have to extract the hash from
    //the resulting exception (there is supposed to be a non-hacky way but it
    //does not presently work)
    let txHash;
    try {
      await instance.run(); //this will throw because of the revert
    } catch (error) {
      txHash = error.hashes[0]; //it's the only hash involved
    }

    let bugger = await Debugger.forTx(txHash, {
      provider,
      contracts: artifacts
    });

    let session = bugger.connect();

    assert.ok(!session.view(sessionSelector.transaction.receipt).status);
  });

  it("Gets vars at end of successful contract (and marks it successful)", async function() {
    let instance = await abstractions.SuccessTest.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      contracts: artifacts
    });

    let session = bugger.connect();

    session.continueUntilBreakpoint(); //no breakpoints set so advances to end

    assert.ok(session.view(sessionSelector.transaction.receipt).status);
    assert.deepEqual(session.view(data.current.identifiers.native), { x: 107 });
  });
});
