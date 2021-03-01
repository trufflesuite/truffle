import debugModule from "debug";
const debug = debugModule("debugger:test:load");

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts } from "./helpers";
import * as Codec from "@truffle/codec";
import Debugger from "lib/debugger";

import trace from "lib/trace/selectors";
import controller from "lib/controller/selectors";

const __TWOCONTRACTS = `
pragma solidity ^0.8.0;

contract Contract1 {
  uint x;
  function run() public {
    x = 1;
  }
}

contract Contract2 {
  uint y;
  function run() public {
    y = 2;
  }
}
`;

let sources = {
  "TwoContracts.sol": __TWOCONTRACTS
};

describe("Loading and unloading transactions", function () {
  var provider;

  var abstractions;
  var compilations;

  before("Create Provider", async function () {
    provider = Ganache.provider({ seed: "debugger", gasLimit: 7000000 });
  });

  before("Prepare contracts and artifacts", async function () {
    this.timeout(30000);

    let prepared = await prepareContracts(provider, sources);
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;
  });

  it("Starts in transactionless mode and loads a transaction", async function () {
    let instance = await abstractions.Contract1.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forProject({
      provider,
      compilations
    });

    assert.isFalse(bugger.view(trace.loaded));
    await bugger.load(txHash);
    assert.isTrue(bugger.view(trace.loaded));
    await bugger.continueUntilBreakpoint(); //continue to end
    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );
    const expected = { x: 1 };
    assert.deepInclude(variables, expected);
  });

  it("Unloads a transaction and loads a new one", async function () {
    let instance1 = await abstractions.Contract1.deployed();
    let receipt1 = await instance1.run();
    let txHash1 = receipt1.tx;

    let instance2 = await abstractions.Contract2.deployed();
    let receipt2 = await instance2.run();
    let txHash2 = receipt2.tx;

    let bugger = await Debugger.forTx(txHash1, {
      provider,
      compilations
    });

    assert.isTrue(bugger.view(trace.loaded));
    await bugger.continueUntilBreakpoint(); //continue to end
    let variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );
    let expected = { x: 1 };
    assert.deepInclude(variables, expected);
    await bugger.unload();
    assert.isFalse(bugger.view(trace.loaded));
    await bugger.load(txHash2);
    assert.isTrue(bugger.view(trace.loaded));
    await bugger.continueUntilBreakpoint(); //continue to end
    variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );
    expected = { y: 2 };
    assert.deepInclude(variables, expected);
  });

  it("Doesn't crash getting location when transactionless", async function () {
    let bugger = await Debugger.forProject({
      provider,
      compilations,
      lightMode: true
    });

    assert.isDefined(bugger.view(controller.current.location));
  });
});
