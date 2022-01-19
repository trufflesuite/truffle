import debugModule from "debug";
const debug = debugModule("debugger:test:data:function-decoding");

import { assert } from "chai";

import Ganache from "ganache";

import { prepareContracts, lineOf } from "../helpers";
import Debugger from "lib/debugger";
import * as Codec from "@truffle/codec";

import solidity from "lib/solidity/selectors";

const __EXTERNALS = `
pragma solidity ^0.8.0;

contract ExternalsTester {

  event Done();

  function() external storageFn;

  ExternalsBase base;

  constructor() {
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
  function dummy() public {
    //this function just distinguishes ExternalsBase from ExternalsDerived
  }
}
`;

const __INTERNALS = `
pragma solidity ^0.8.0;

contract InternalsBase {

  event Log(uint);

  function inherited() public virtual {
    emit Log(0);
  }
}

library InternalsLib {

  event Done();

  function libraryFn() internal {
    emit Done();
  }
}

function freeFn() {
  InternalsLib.libraryFn();
}

contract InternalsTest is InternalsBase {

  function inherited() public override {
    emit Log(1);
  }

  function() internal storageFn;

  function run() public {
    function() internal plainFn;
    function() internal derivedFn;
    function() internal baseFn;
    function() internal libFn;
    function() internal storedFreeFn;
    function() internal undefFn;
    function() internal readFromConstructor;

    plainFn = run;
    derivedFn = InternalsTest.inherited;
    baseFn = InternalsBase.inherited;
    libFn = InternalsLib.libraryFn;
    storedFreeFn = freeFn;
    readFromConstructor = storageFn;

    emit Log(2); //BREAK HERE (DEPLOYED)
  }

  constructor() {
    function() internal plainFn;
    function() internal derivedFn;
    function() internal baseFn;
    function() internal libFn;
    function() internal storedFreeFn;
    function() internal undefFn;

    plainFn = run;
    derivedFn = InternalsTest.inherited;
    baseFn = InternalsBase.inherited;
    libFn = InternalsLib.libraryFn;
    storedFreeFn = freeFn;

    storageFn = run;

    emit Log(2); //BREAK HERE (CONSTRUCTOR)
  }
}
`;

let sources = {
  "ExternalsTest.sol": __EXTERNALS,
  "InternalsTest.sol": __INTERNALS
};

describe("Function Pointer Decoding", function () {
  let provider;
  let abstractions;
  let compilations;

  before("Create Provider", async function () {
    provider = Ganache.provider({
      seed: "debugger",
      gasLimit: 7000000,
      logging: {
        quiet: true
      },
      miner: {
        instamine: "strict"
      }
    });
  });

  before("Prepare contracts and artifacts", async function () {
    this.timeout(30000);

    let prepared = await prepareContracts(provider, sources);
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;
  });

  it("Decodes external function pointers correctly", async function () {
    this.timeout(3000);

    let instance = await abstractions.ExternalsTester.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let sourceId = bugger.view(solidity.current.source).id;
    let source = bugger.view(solidity.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("BREAK HERE", source)
    });

    await bugger.continueUntilBreakpoint();

    const variables = await bugger.variables();

    assert.equal(variables.base.value.class.typeName, "ExternalsDerived");
    assert.equal(
      variables.storageFn.value.contract.class.typeName,
      "ExternalsDerived"
    );
    assert.equal(variables.storageFn.value.abi.name, "doThing");
    assert.equal(
      variables.memoryFns.value[0].value.contract.class.typeName,
      "ExternalsDerived"
    );
    assert.equal(variables.memoryFns.value[0].value.abi.name, "doThing");
    assert.equal(
      variables.stackFn.value.contract.class.typeName,
      "ExternalsDerived"
    );
    assert.equal(variables.stackFn.value.abi.name, "doThing");
  });

  it("Decodes internal function pointers correctly (deployed)", async function () {
    this.timeout(3000);

    let instance = await abstractions.InternalsTest.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let sourceId = bugger.view(solidity.current.source).id;
    let source = bugger.view(solidity.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("BREAK HERE (DEPLOYED)", source)
    });

    await bugger.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );

    const expectedResult = {
      plainFn: "InternalsTest.run",
      derivedFn: "InternalsTest.inherited",
      baseFn: "InternalsBase.inherited",
      libFn: "InternalsLib.libraryFn",
      storedFreeFn: "freeFn",
      undefFn: "<uninitialized>",
      storageFn: "InternalsTest.run",
      readFromConstructor: "InternalsTest.run"
    };

    assert.include(variables, expectedResult);
  });

  it("Decodes internal function pointers correctly (constructor)", async function () {
    this.timeout(3000);

    let receipt = await abstractions.InternalsTest.new();
    let txHash = receipt.transactionHash;

    let bugger = await Debugger.forTx(txHash, { provider, compilations });

    let sourceId = bugger.view(solidity.current.source).id;
    let source = bugger.view(solidity.current.source).source;
    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("BREAK HERE (CONSTRUCTOR)", source)
    });

    await bugger.continueUntilBreakpoint();

    const variables = Codec.Format.Utils.Inspect.unsafeNativizeVariables(
      await bugger.variables()
    );

    const expectedResult = {
      plainFn: "InternalsTest.run",
      derivedFn: "InternalsTest.inherited",
      baseFn: "InternalsBase.inherited",
      libFn: "InternalsLib.libraryFn",
      storedFreeFn: "freeFn",
      undefFn: "<uninitialized>",
      storageFn: "InternalsTest.run"
    };

    assert.include(variables, expectedResult);
  });
});
