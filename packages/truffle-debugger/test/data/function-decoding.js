import debugModule from "debug";
const debug = debugModule("test:data:function-decoding");

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts, lineOf } from "../helpers";
import Debugger from "lib/debugger";

import solidity from "lib/solidity/selectors";

const __EXTERNALS = `
pragma solidity ^0.5.0;

contract Tester {

  event Done();

  function() external storageFn;

  Base base;

  constructor() public {
    base = new Derived();
  }

  function run() public {
    function() external[1] memory memoryFns;
    function() external stackFn;
    
    storageFn = base.doThing;
    memoryFns[0] = base.doThing;
    stackFn = base.doThing;

    emit Done(); //BREAK HERE
  }
}

contract Base {

  event Done();

  function doThing() public {
    emit Done();
  }
}

contract Derived is Base {
}
`;

let sources = {
  "ExternalsTest.sol": __EXTERNALS
};

describe("Function Pointer Decoding", function() {
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

  it("Decodes external function pointers correctly", async function() {
    this.timeout(3000);

    let instance = await abstractions.Tester.deployed();
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
    await session.addBreakpoint({
      sourceId,
      line: lineOf("BREAK HERE", source)
    });

    await session.continueUntilBreakpoint();

    const variables = await session.variables();

    assert.match(variables.base, /^Derived\(0x[0-9A-Fa-f]{40}\)/);
    let expected = variables.base + ".doThing";
    assert.equal(variables.storageFn, expected);
    assert.equal(variables.memoryFns[0], expected);
    assert.equal(variables.stackFn, expected);
  });
});
