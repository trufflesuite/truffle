import debugModule from "debug";
const debug = debugModule("debugger:test:step");

import { assert } from "chai";

import Ganache from "ganache";

import { prepareContracts, lineOf, testBlockGasLimit } from "./helpers";
import Debugger from "lib/debugger";

import controller from "lib/controller/selectors";

const __STEPPY = `
pragma solidity ^0.8.0;

contract Steppy {
  function run() public {
    this.called(1); //SOL CALL LINE
    emit Num(23); //SOL AFTER LINE
  }

  event Num(uint);

  function called(uint x) public { //SOL CALLED LINE
    //we include an argument here to ensure there's a generated source
    emit Num(x); //SOL INSIDE LINE
  }

  function yulTest() public {
    assembly {
      function f() { //YUL CALLED LINE
        log1(0, 0, 2) //YUL INSIDE LINE
      }
      log1(0, 0, 1) //YUL INTERMED LINE
      f() //YUL CALL LINE
      log1(0, 0, 3) //YUL AFTER LINE
    }
  }
}
`;

let sources = {
  "Steppy.sol": __STEPPY
};

describe("Stepping functions", function () {
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

    let prepared = await prepareContracts(provider, sources);
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;
  });

  it("Steps correctly with step next", async function () {
    this.timeout(5000);
    let instance = await abstractions.Steppy.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    let previousSourceRange = bugger.view(
      controller.current.location.sourceRange
    );
    let previousSource = bugger.view(controller.current.location.source);
    await bugger.stepNext();
    let currentSourceRange = bugger.view(
      controller.current.location.sourceRange
    );
    let currentSource = bugger.view(controller.current.location.source);

    while (!bugger.view(controller.current.trace.finished)) {
      //check: we never end up back in the same place after a step
      assert(
        previousSourceRange.start !== currentSourceRange.start ||
          previousSourceRange.length !== currentSourceRange.length ||
          previousSource.id !== currentSource.id ||
          previousSource.compilationId !== currentSource.compilationId
      );
      //check: we don't step into an internal source w/o asking for it
      assert(!currentSource.internal);

      //set things up for next iteration
      previousSourceRange = currentSourceRange;
      await bugger.stepNext();
      currentSourceRange = bugger.view(controller.current.location.sourceRange);
    }
  });

  it("Steps correctly with step into", async function () {
    this.timeout(5000);
    let instance = await abstractions.Steppy.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    let previousSourceRange = bugger.view(
      controller.current.location.sourceRange
    );
    let previousSource = bugger.view(controller.current.location.source);
    await bugger.stepInto();
    let currentSourceRange = bugger.view(
      controller.current.location.sourceRange
    );
    let currentSource = bugger.view(controller.current.location.source);

    while (!bugger.view(controller.current.trace.finished)) {
      //check: we're always on a different line after step into
      assert(
        previousSourceRange.lines.start.line !==
          currentSourceRange.lines.start.line ||
          previousSource.id !== currentSource.id ||
          previousSource.compilationId !== currentSource.compilationId
      );
      //check: we don't step into an internal source w/o asking for it
      assert(!currentSource.internal);

      //set things up for next iteration
      previousSourceRange = currentSourceRange;
      await bugger.stepInto();
      currentSourceRange = bugger.view(controller.current.location.sourceRange);
    }
  });

  it("Steps over a function from the call site", async function () {
    this.timeout(5000);
    let instance = await abstractions.Steppy.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    let sourceId = bugger.view(controller.current.location.source).id;
    let source = bugger.view(controller.current.location.source).source;

    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("SOL CALL LINE", source)
    });
    await bugger.continueUntilBreakpoint();
    //now: do we step over correctly?
    await bugger.stepOver();
    assert.equal(
      bugger.view(controller.current.location.sourceRange).lines.start.line,
      lineOf("SOL AFTER LINE", source)
    );
  });

  it("Steps over a function from the definition", async function () {
    this.timeout(5000);
    let instance = await abstractions.Steppy.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    let sourceId = bugger.view(controller.current.location.source).id;
    let source = bugger.view(controller.current.location.source).source;

    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("SOL CALLED LINE", source)
    });
    await bugger.continueUntilBreakpoint();
    //now: do we step over correctly?
    await bugger.stepOver();
    assert.equal(
      bugger.view(controller.current.location.sourceRange).lines.start.line,
      lineOf("SOL CALL LINE", source)
    );
  });

  it("Steps out of a function", async function () {
    this.timeout(5000);
    let instance = await abstractions.Steppy.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    let sourceId = bugger.view(controller.current.location.source).id;
    let source = bugger.view(controller.current.location.source).source;

    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("SOL INSIDE LINE", source)
    });
    await bugger.continueUntilBreakpoint();
    //now: do we step out correctly?
    await bugger.stepOut();
    assert.equal(
      bugger.view(controller.current.location.sourceRange).lines.start.line,
      lineOf("SOL CALL LINE", source)
    );
  });

  it("Steps out of a function from the definition", async function () {
    this.timeout(5000);
    let instance = await abstractions.Steppy.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    let sourceId = bugger.view(controller.current.location.source).id;
    let source = bugger.view(controller.current.location.source).source;

    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("SOL CALLED LINE", source)
    });
    await bugger.continueUntilBreakpoint();
    //now: do we step out correctly?
    await bugger.stepOut();
    assert.equal(
      bugger.view(controller.current.location.sourceRange).lines.start.line,
      lineOf("SOL CALL LINE", source)
    );
  });

  it("Steps over a Yul function from the call site", async function () {
    this.timeout(5000);
    let instance = await abstractions.Steppy.deployed();
    let receipt = await instance.yulTest();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    let sourceId = bugger.view(controller.current.location.source).id;
    let source = bugger.view(controller.current.location.source).source;

    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("YUL CALL LINE", source)
    });
    await bugger.continueUntilBreakpoint();
    //now: do we step over correctly?
    await bugger.stepOver();
    assert.equal(
      bugger.view(controller.current.location.sourceRange).lines.start.line,
      lineOf("YUL AFTER LINE", source)
    );
  });

  it("Steps over a Yul function from the definition", async function () {
    this.timeout(5000);
    let instance = await abstractions.Steppy.deployed();
    let receipt = await instance.yulTest();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    let sourceId = bugger.view(controller.current.location.source).id;
    let source = bugger.view(controller.current.location.source).source;

    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("YUL CALLED LINE", source)
    });
    await bugger.continueUntilBreakpoint();
    //first time we hit it, it should be because it's being defined, *not* because
    //it's being called!  let's check that stepOver gets us past that
    await bugger.stepOver();
    assert.equal(
      bugger.view(controller.current.location.sourceRange).lines.start.line,
      lineOf("YUL INTERMED LINE", source)
    );
    await bugger.continueUntilBreakpoint();
    //OK, back to the definition.  it should actually be being called now.
    //now: do we step over correctly?
    await bugger.stepOver();
    assert.equal(
      bugger.view(controller.current.location.sourceRange).lines.start.line,
      lineOf("YUL CALL LINE", source)
    );
  });

  it("Steps out of a Yul function", async function () {
    this.timeout(5000);
    let instance = await abstractions.Steppy.deployed();
    let receipt = await instance.yulTest();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    let sourceId = bugger.view(controller.current.location.source).id;
    let source = bugger.view(controller.current.location.source).source;

    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("YUL INSIDE LINE", source)
    });
    await bugger.continueUntilBreakpoint();
    //now: do we step out correctly?
    await bugger.stepOut();
    assert.equal(
      bugger.view(controller.current.location.sourceRange).lines.start.line,
      lineOf("YUL CALL LINE", source)
    );
  });

  it("Steps out of a Yul function from the definition", async function () {
    this.timeout(5000);
    let instance = await abstractions.Steppy.deployed();
    let receipt = await instance.yulTest();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations
    });

    let sourceId = bugger.view(controller.current.location.source).id;
    let source = bugger.view(controller.current.location.source).source;

    await bugger.addBreakpoint({
      sourceId,
      line: lineOf("YUL CALLED LINE", source)
    });
    await bugger.continueUntilBreakpoint(); //first occurrence is definition, not call
    await bugger.continueUntilBreakpoint(); //the *second* occurrence is the one we want
    //now: do we step out correctly?
    await bugger.stepOut();
    assert.equal(
      bugger.view(controller.current.location.sourceRange).lines.start.line,
      lineOf("YUL CALL LINE", source)
    );
  });
});
