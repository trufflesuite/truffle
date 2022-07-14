import debugModule from "debug";
const debug = debugModule("debugger:test:data:lookup");

import { assert } from "chai";
import { promisify } from "util";

import Ganache from "ganache";

import { prepareContracts, testBlockGasLimit } from "../helpers";
import Debugger from "lib/debugger";

import * as Codec from "@truffle/codec";

const __SIMPLE = `
pragma solidity ^0.8.0;

contract SimpleStorage {
  uint public x;
  constructor(uint initialX) {
    //note: this is being included to get around
    //https://github.com/trufflesuite/ganache/issues/3338 ;
    //once that issue is fixed we should get rid of it
    x = initialX;
  }
  function set(uint newX) public {
    x = newX;
  }
}
`;

const sources = {
  "SimpleStorage.sol": __SIMPLE
};

describe("Storage lookup option", function () {
  let provider;

  let abstractions;
  let compilations;

  async function mine() {
    await promisify(provider.send.bind(provider))({
      jsonrpc: "2.0",
      method: "evm_mine",
      id: Date.now(),
      params: [Date.now()]
    });
  }

  async function waitForTransactionHash(promiEvent) {
    return new Promise((accept, reject) =>
      promiEvent.once("transactionHash", accept).once("error", reject)
    );
  }

  before("Create Provider", async function () {
    provider = Ganache.provider({
      seed: "debugger",
      miner: {
        instamine: "strict", //we're going to be performing mines manually
        blockGasLimit: testBlockGasLimit
      },
      logging: {
        quiet: true
      }
    });
    debug("got provider");
    //stop mining, we're going to do mining manually
    await promisify(provider.send.bind(provider))({
      jsonrpc: "2.0",
      method: "miner_stop",
      id: Date.now(),
      params: []
    });
    debug("mining stopped");
  });

  before("Prepare contracts and artifacts", async function () {
    this.timeout(30000);

    const prepared = await prepareContracts(provider, sources, null); //skip migrations, we're doing this manually!
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;
  });

  it("Displays values from previous transactions", async function () {
    this.timeout(12000);

    const instancePromiEvent = abstractions.SimpleStorage.new(1); //don't await it yet!
    debug("awaiting sending...");
    await waitForTransactionHash(instancePromiEvent);
    debug("awaiting first mine...");
    await mine();
    debug("first mined");
    const instance = await instancePromiEvent; //await it once we've done a mine
    debug("got instance, awaiting sending of tx #1");
    await waitForTransactionHash(instance.set(3)); //just here to provide a previous value
    debug("tx #1 sent, sending tx #2");
    const txPromiEvent = instance.set(5); //again, don't await it yet
    debug("awaiting sending of #2");
    await waitForTransactionHash(txPromiEvent);
    debug("awaiting second mine...");
    await mine();
    debug("second mined");
    const receipt = await txPromiEvent;
    debug("got receipt");
    const txHash = receipt.tx;

    //confirm: that there were previous transactions in the block
    assert.equal(receipt.receipt.transactionIndex, 1);

    const bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      storageLookup: true
    });

    await bugger.stepNext(); //just step into the contract

    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );

    const expectedResult = {
      x: 3 //previous value
    };

    assert.deepInclude(variables, expectedResult);
  });
});
