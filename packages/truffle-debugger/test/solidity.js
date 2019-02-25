import debugModule from "debug";
const debug = debugModule("test:solidity"); // eslint-disable-line no-unused-vars

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts } from "./helpers";
import Debugger from "lib/debugger";

import solidity from "lib/solidity/selectors";
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

const __NESTED_CALL = `pragma solidity ~0.5;

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
    second();
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

let sources = {
  "SingleCall.sol": __SINGLE_CALL,
  "NestedCall.sol": __NESTED_CALL
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
    let breakpoint = { sourceId: source.id, line: 16 };

    await session.addBreakpoint(breakpoint);

    do {
      await session.continueUntilBreakpoint();

      if (!session.view(trace.finished)) {
        let range = session.view(solidity.current.sourceRange);
        assert.equal(range.lines.start.line, 16);
      }
    } while (!session.view(trace.finished));
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
      let expectedDepthSequence = [0, 1, 2, 3, 2, 1, 2, 1, -1];
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
  });
});
