import debugModule from "debug";
const debug = debugModule("test:data:function-decoding");

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts, lineOf } from "../helpers";
import Debugger from "lib/debugger";

import solidity from "lib/solidity/selectors";

const __EXTERNALS = `
pragma solidity ^0.5.0;

contract ExternalsTester {

  event Done();

  function() external storageFn;

  ExternalsBase base;

  constructor() public {
    base = new ExternalsDerived();
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

contract ExternalsBase {

  event Done();

  function doThing() public {
    emit Done();
  }
}

contract ExternalsDerived is ExternalsBase {
}
`;

const __INTERNALS = `
pragma solidity ^0.5.0;

contract InternalsBase {

  event Log(uint);

  function inherited() public {
    emit Log(0);
  }
}

library InternalsLib {

  event Done();
  
  function libraryFn() internal {
    emit Done();
  }
}

contract InternalsTest is InternalsBase {

  function inherited() public {
    emit Log(1);
  }

  function() internal storageFn;

  function run() public {
    function() internal plainFn;
    function() internal derivedFn;
    function() internal baseFn;
    function() internal libFn;
    function() internal readFromConstructor;

    plainFn = run;
    derivedFn = InternalsTest.inherited;
    baseFn = InternalsBase.inherited;
    libFn = InternalsLib.libraryFn;
    readFromConstructor = storageFn;

    emit Log(2); //BREAK HERE (DEPLOYED)
  }

  constructor() public {
    function() internal plainFn;
    function() internal derivedFn;
    function() internal baseFn;
    function() internal libFn;

    plainFn = run;
    derivedFn = InternalsTest.inherited;
    baseFn = InternalsBase.inherited;
    libFn = InternalsLib.libraryFn;

    storageFn = run;

    emit Log(2); //BREAK HERE (CONSTRUCTOR)
  }
}
`;

let sources = {
  "ExternalsTest.sol": __EXTERNALS,
  "InternalsTest.sol": __INTERNALS
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

    let instance = await abstractions.ExternalsTester.deployed();
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

    assert.match(variables.base, /^ExternalsDerived\(0x[0-9A-Fa-f]{40}\)/);
    let expected = variables.base + ".doThing";
    assert.equal(variables.storageFn, expected);
    assert.equal(variables.memoryFns[0], expected);
    assert.equal(variables.stackFn, expected);
  });

  it("Decodes internal function pointers correctly (deployed)", async function() {
    this.timeout(3000);

    let instance = await abstractions.InternalsTest.deployed();
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
      line: lineOf("BREAK HERE (DEPLOYED)", source)
    });

    await session.continueUntilBreakpoint();

    const variables = await session.variables();

    const expectedResult = {
      plainFn: "InternalsTest.run",
      derivedFn: "InternalsTest.inherited",
      baseFn: "InternalsBase.inherited",
      libFn: "InternalsLib.libraryFn",
      storageFn: "InternalsTest.run",
      readFromConstructor: "InternalsTest.run"
    };

    assert.include(variables, expectedResult);
  });

  it("Decodes internal function pointers correctly (constructor)", async function() {
    this.timeout(3000);

    let receipt = await abstractions.InternalsTest.new();
    let txHash = receipt.transactionHash;

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
      line: lineOf("BREAK HERE (CONSTRUCTOR)", source)
    });

    await session.continueUntilBreakpoint();

    const variables = await session.variables();

    const expectedResult = {
      plainFn: "InternalsTest.run",
      derivedFn: "InternalsTest.inherited",
      baseFn: "InternalsBase.inherited",
      libFn: "InternalsLib.libraryFn",
      storageFn: "InternalsTest.run"
    };

    assert.include(variables, expectedResult);
  });
});
