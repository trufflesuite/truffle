import debugModule from "debug";
const debug = debugModule("test:solidity"); // eslint-disable-line no-unused-vars

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts, lineOf } from "./helpers";
import Debugger from "lib/debugger";

import solidity from "lib/solidity/selectors";
import controller from "lib/controller/selectors";
import trace from "lib/trace/selectors";

const __SINGLE_CALL = `
pragma solidity ~0.5;

contract SingleCall {
  event Called();
  event Done();

  function run() public {
    emit Called();
  }

  function runSha() public {
    emit Called();
    sha256("hello world!");
    emit Done();
  }
}
`;

const __NESTED_CALL = `
pragma solidity ~0.5;

contract NestedCall {
  event First();
  event Second();

  // run()
  //   first()    1
  //     inner()  2
  //       event  3
  //              2
  //   second     1
  //     event    2
  //              1
  function run() public {
    first();
    second(); //BREAK
  }

  function first() public {
    inner();
  }

  function inner() public {
    emit First();
  }

  function second() public {
    emit Second();
  }
}
`;

const __FAILED_CALL = `
pragma solidity ^0.5.0;

contract RevertTest {

  event Begin();
  event Done();

  function() external {
    doStuff();
  }

  function doStuff() public {
    fail();
  }

  function fail() public {
    revert();
  }

  function run() public {
    emit Begin(); //BREAK #1
    address(this).call(hex"");
    emit Done(); //BREAK #2
  }
}
`;

const __ADJUSTMENT = `
pragma solidity ^0.5.0;

contract AdjustTest {

  function run() public returns (uint) {
    //input 0
    uint[] memory c;

    uint w = 35; //output 0, input 1, output 1

    return w + c.length;
  } //input 2
}
`;

let sources = {
  "SingleCall.sol": __SINGLE_CALL,
  "NestedCall.sol": __NESTED_CALL,
  "FailedCall.sol": __FAILED_CALL,
  "AdjustTest.sol": __ADJUSTMENT
};

describe("Solidity Debugging", function() {
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

  it("exposes functionality to stop at breakpoints", async function() {
    // prepare
    let instance = await abstractions.NestedCall.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      files,
      contracts: artifacts
    });

    let session = bugger.connect();

    // at `second();`
    let source = session.view(solidity.current.source);
    let breakLine = lineOf("BREAK", source.source);
    let breakpoint = { sourceId: source.id, line: breakLine };

    await session.addBreakpoint(breakpoint);

    do {
      await session.continueUntilBreakpoint();

      if (!session.view(trace.finished)) {
        let range = session.view(solidity.current.sourceRange);
        assert.equal(range.lines.start.line, breakLine);
      }
    } while (!session.view(trace.finished));
  });

  it("exposes functionality to stop at specified breakpoints", async function() {
    // prepare
    let instance = await abstractions.NestedCall.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      files,
      contracts: artifacts
    });

    let session = bugger.connect();

    // at `second();`
    let source = session.view(solidity.current.source);
    let breakLine = lineOf("BREAK", source.source);
    let breakpoint = { sourceId: source.id, line: breakLine };

    do {
      await session.continueUntilBreakpoint([breakpoint]);

      if (!session.view(trace.finished)) {
        let range = session.view(solidity.current.sourceRange);
        assert.equal(range.lines.start.line, breakLine);
      }
    } while (!session.view(trace.finished));
  });

  it("correctly resolves breakpoints", async function() {
    // prepare
    let instance = await abstractions.AdjustTest.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      files,
      contracts: artifacts
    });

    let session = bugger.connect();

    let resolver = session.view(controller.breakpoints.resolver);
    let source = session.view(solidity.current.source);

    let breakpoints = [];
    let expectedResolutions = [];

    const NUM_TESTS = 3;

    for (let i = 0; i < NUM_TESTS; i++) {
      let inputLine = lineOf("input " + i, source.source);
      breakpoints.push({ sourceId: source.id, line: inputLine });
      let outputLine = lineOf("output " + i, source.source);
      expectedResolutions.push(
        outputLine !== -1 //lineOf will return -1 if no such line exists
          ? { sourceId: source.id, line: outputLine }
          : null
      );
    }

    let resolutions = breakpoints.map(resolver);
    assert.deepEqual(resolutions, expectedResolutions);
  });

  describe("Function Depth", function() {
    it("remains at 1 in absence of inner function calls", async function() {
      const maxExpected = 1;

      let instance = await abstractions.SingleCall.deployed();
      let receipt = await instance.run();
      let txHash = receipt.tx;

      let bugger = await Debugger.forTx(txHash, {
        provider,
        files,
        contracts: artifacts
      });

      let session = bugger.connect();
      var finished;

      do {
        await session.stepNext();
        finished = session.view(trace.finished);

        let actual = session.view(solidity.current.functionDepth);

        assert.isAtMost(actual, maxExpected);
      } while (!finished);
    });

    it("is unaffected by precompiles", async function() {
      const numExpected = 1;

      let instance = await abstractions.SingleCall.deployed();
      let receipt = await instance.runSha();
      let txHash = receipt.tx;

      let bugger = await Debugger.forTx(txHash, {
        provider,
        files,
        contracts: artifacts
      });

      let session = bugger.connect();

      let hasBegun = false; //we don't check until it's nonzero, since it
      //starts as zero now

      while (!session.view(trace.finished)) {
        let actual = session.view(solidity.current.functionDepth);
        if (actual !== 0) {
          hasBegun = true;
        }
        if (hasBegun) {
          assert.equal(actual, numExpected);
        }

        await session.stepNext();
      }

      assert(hasBegun); //check for non-vacuity of the above tests
    });

    it("spelunks correctly", async function() {
      // prepare
      let instance = await abstractions.NestedCall.deployed();
      let receipt = await instance.run();
      let txHash = receipt.tx;

      let bugger = await Debugger.forTx(txHash, {
        provider,
        files,
        contracts: artifacts
      });

      let session = bugger.connect();

      // follow functionDepth values in list
      // see source above
      let expectedDepthSequence = [0, 1, 2, 3, 2, 1, 2, 1, 0];
      //end at -1 due to losing 2 from contract method return
      let actualSequence = [session.view(solidity.current.functionDepth)];

      var finished;

      do {
        await session.stepNext();
        finished = session.view(trace.finished);

        let currentDepth = session.view(solidity.current.functionDepth);
        let lastKnown = actualSequence[actualSequence.length - 1];

        if (currentDepth !== lastKnown) {
          actualSequence.push(currentDepth);
        }
      } while (!finished);

      assert.deepEqual(actualSequence, expectedDepthSequence);
    });

    it("unwinds correctly on call failure", async function() {
      // prepare
      let instance = await abstractions.RevertTest.deployed();
      let receipt = await instance.run();
      let txHash = receipt.tx;

      let bugger = await Debugger.forTx(txHash, {
        provider,
        files,
        contracts: artifacts
      });

      let session = bugger.connect();

      let source = session.view(solidity.current.source);
      let breakLine1 = lineOf("BREAK #1", source.source);
      let breakpoint1 = { sourceId: source.id, line: breakLine1 };
      await session.addBreakpoint(breakpoint1);
      let breakLine2 = lineOf("BREAK #2", source.source);
      let breakpoint2 = { sourceId: source.id, line: breakLine2 };
      await session.addBreakpoint(breakpoint2);

      await session.continueUntilBreakpoint();
      let depthBefore = session.view(solidity.current.functionDepth);
      await session.continueUntilBreakpoint();
      let depthAfter = session.view(solidity.current.functionDepth);

      assert.equal(depthAfter, depthBefore);
    });
  });
});
