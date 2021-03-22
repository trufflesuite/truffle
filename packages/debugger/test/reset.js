import debugModule from "debug";
const debug = debugModule("debugger:test:reset");

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts, lineOf } from "./helpers";
import * as Codec from "@truffle/codec";
import Debugger from "lib/debugger";

import solidity from "lib/solidity/selectors";

const __SETSTHINGS = `
pragma solidity ^0.8.0;

contract SetsThings {
  int x;
  int y;
  int z;
  int w;
  function run() public {
    x = 1;
    y = 2; //BREAK
    z = 3;
    w = 4;
  }
}
`;

let sources = {
  "SetsThings.sol": __SETSTHINGS
};

describe("Reset Button", function () {
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

  it("Correctly resets after finishing", async function () {
    let instance = await abstractions.SetsThings.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    let sourceId = bugger.view(solidity.current.source).id;
    let source = bugger.view(solidity.current.source).source;

    let variables = [];
    variables[0] = []; //collected during 1st run
    variables[1] = []; //collected during 2nd run

    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("BREAK", source)
    });

    variables[0].push(
      Codec.Format.Utils.Inspect.unsafeNativizeVariables(await bugger.variables())
    );
    await bugger.continueUntilBreakpoint(); //advance to line 10
    variables[0].push(
      Codec.Format.Utils.Inspect.unsafeNativizeVariables(await bugger.variables())
    );
    await bugger.continueUntilBreakpoint(); //advance to the end
    variables[0].push(
      Codec.Format.Utils.Inspect.unsafeNativizeVariables(await bugger.variables())
    );

    //now, reset and do it again
    await bugger.reset();

    variables[1].push(
      Codec.Format.Utils.Inspect.unsafeNativizeVariables(await bugger.variables())
    );
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("BREAK", source)
    });
    await bugger.continueUntilBreakpoint(); //advance to line 10
    variables[1].push(
      Codec.Format.Utils.Inspect.unsafeNativizeVariables(await bugger.variables())
    );
    await bugger.continueUntilBreakpoint(); //advance to the end
    variables[1].push(
      Codec.Format.Utils.Inspect.unsafeNativizeVariables(await bugger.variables())
    );

    assert.deepEqual(variables[1], variables[0]);
  });
});
