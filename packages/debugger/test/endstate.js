import debugModule from "debug";
const debug = debugModule("debugger:test:endstate");

import { assert } from "chai";

import Ganache from "ganache";

import {
  prepareContracts,
  testBlockGasLimit,
  testDefaultTxGasLimit
} from "./helpers";
import Debugger from "lib/debugger";

import evm from "lib/evm/selectors";

import * as Codec from "@truffle/codec";

const __FAILURE = `
pragma solidity ^0.8.0;

contract FailureTest {
  function run() public {
    revert();
  }
}
`;

const __SUCCESS = `
pragma solidity ^0.8.0;

contract SuccessTest {
uint x;
  function run() public {
    x = 107;
  }
}
`;

const sources = {
  "FailureTest.sol": __FAILURE,
  "SuccessTest.sol": __SUCCESS
};

describe("End State", function () {
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

    const prepared = await prepareContracts(provider, sources);
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;
  });

  it("correctly marks a failed transaction as failed", async function () {
    const instance = await abstractions.FailureTest.deployed();
    //HACK: because this transaction fails, we have to extract the hash from
    //the resulting exception (there is supposed to be a non-hacky way but it
    //does not presently work)
    let txHash;
    try {
      await instance.run({ gas: testDefaultTxGasLimit });
    } catch (error) {
      txHash = error.receipt.transactionHash;
    }
    assert.isDefined(txHash, "should have errored and set txHash");

    const bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });

    assert.ok(!bugger.view(evm.transaction.status));
  });

  it("Gets vars at end of successful contract (and marks it successful)", async function () {
    this.timeout(4000);
    const instance = await abstractions.SuccessTest.deployed();
    const receipt = await instance.run();
    const txHash = receipt.tx;

    const bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    await bugger.runToEnd();

    assert.ok(bugger.view(evm.transaction.status));
    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );
    assert.include(variables, { x: 107 });
  });
});
