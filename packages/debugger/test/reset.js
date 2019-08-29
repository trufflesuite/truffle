import debugModule from "debug";
const debug = debugModule("test:reset"); // eslint-disable-line no-unused-vars

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts, lineOf } from "./helpers";
import * as TruffleDecodeUtils from "truffle-decode-utils";
import Debugger from "lib/debugger";

import solidity from "lib/solidity/selectors";

const __SETSTHINGS = `
pragma solidity ~0.5;

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

describe("Reset Button", function() {
  var provider;

  var abstractions;
  var artifacts;
  var files;

  before("Create Provider", async function() {
    provider = Ganache.provider({ seed: "debugger", gasLimit: 7000000 });
  });

  before("Prepare contracts and artifacts", async function() {
    this.timeout(30000);

    let prepared = await prepareContracts(provider, sources);
    abstractions = prepared.abstractions;
    artifacts = prepared.artifacts;
    files = prepared.files;
  });

  it("Correctly resets after finishing", async function() {
    let instance = await abstractions.SetsThings.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      files,
      contracts: artifacts
    });

    let session = bugger.connect();
    let sourceId = session.view(solidity.current.source).id;
    let source = session.view(solidity.current.source).source;

    let variables = [];
    variables[0] = []; //collected during 1st run
    variables[1] = []; //collected during 2nd run

    await session.addBreakpoint({ sourceId, line: lineOf("BREAK", source) });

    variables[0].push(
      TruffleDecodeUtils.Conversion.cleanBNs(await session.variables())
    );
    await session.continueUntilBreakpoint(); //advance to line 10
    variables[0].push(
      TruffleDecodeUtils.Conversion.cleanBNs(await session.variables())
    );
    await session.continueUntilBreakpoint(); //advance to the end
    variables[0].push(
      TruffleDecodeUtils.Conversion.cleanBNs(await session.variables())
    );

    //now, reset and do it again
    await session.reset();

    variables[1].push(
      TruffleDecodeUtils.Conversion.cleanBNs(await session.variables())
    );
    await session.addBreakpoint({ sourceId, line: lineOf("BREAK", source) });
    await session.continueUntilBreakpoint(); //advance to line 10
    variables[1].push(
      TruffleDecodeUtils.Conversion.cleanBNs(await session.variables())
    );
    await session.continueUntilBreakpoint(); //advance to the end
    variables[1].push(
      TruffleDecodeUtils.Conversion.cleanBNs(await session.variables())
    );

    assert.deepEqual(variables[1], variables[0]);
  });
});
