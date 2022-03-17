import debugModule from "debug";
const debug = debugModule("debugger:test:sourcemapping");

import { assert } from "chai";

import Ganache from "ganache";

import { prepareContracts, lineOf } from "./helpers";
import Debugger from "lib/debugger";

import sourcemapping from "lib/sourcemapping/selectors";
import controller from "lib/controller/selectors";
import trace from "lib/trace/selectors";

const __SINGLE_CALL = `
pragma solidity ^0.8.0;

contract SingleCall {
  event Called();
  event Done();

  //note this function should call generated sources at startup
  function run(uint x) public returns (uint) {
    emit Called();
    return x;
  }

  function runSha() public {
    emit Called();
    sha256("hello world!");
    emit Done();
  }
}
`;

const __NESTED_CALL = `
pragma solidity ^0.8.0;

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
pragma solidity ^0.8.0;

contract RevertTest {

  event Begin();
  event Done();

  fallback() external {
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

const __OVER_TRANSFER = `
pragma solidity ^0.8.0;

contract BadTransferTest {

  Recipient recipient;

  function run() public {
    recipient = (new Recipient){value:address(this).balance + 1 wei}();
  }
}

contract Recipient {
  constructor() public payable {
  }
}
`;

const __ADJUSTMENT = `
pragma solidity ^0.8.0;

contract AdjustTest {

  function run() public returns (uint) {
    //input 0
    uint[] memory c;
    {
      assembly {
        let x
      }
    }

    uint w = 35; //output 0, input 1, output 1

    assembly {
      let x //input 3
      pop(x) //output 3
    }

    return w + c.length;
  } //input 2
}
`;

const __COMPLEX_CALLS = `
pragma solidity ^0.8.0;

enum Color { Red, Green, Blue }

contract DepthTest {

  Secondary secondary;

  function run() public {
    secondary.doStuff();
    DepthLibrary.doStuff(Color.Red, secondary);
  }

  constructor(Secondary it) {
    secondary = it;
    secondary.doStuff();
    DepthLibrary.doStuff(Color.Green, secondary);
  }

  fallback() external {
    secondary.doStuff();
    DepthLibrary.doStuff(Color.Blue, secondary);
  }
}

contract Secondary {

  event Here();

  function doStuff() public {
    this.doMoreStuff();
  }

  function doMoreStuff() public {
    emit Here();
  }
}

library DepthLibrary {
  event Show(Color);

  function doStuff(Color color, Secondary secondary) external {
    secondary.doMoreStuff();
    emit Show(color);
  }
}
`;

const __CALL_YUL = `
object "YulFnTest" {
  code {
    let size := datasize("runtime")
    datacopy(0, dataoffset("runtime"), size)
    return(0, size)
  }
  object "runtime" {
    code {
      function one() -> a {
        a := 1 //BREAK
      }
      mstore(0, one())
      return(0, 0x20)
    }
  }
}
`;

const __MIGRATION = `
const SingleCall = artifacts.require("SingleCall");
const NestedCall = artifacts.require("NestedCall");
const RevertTest = artifacts.require("RevertTest");
const BadTransferTest = artifacts.require("BadTransferTest");
const AdjustTest = artifacts.require("AdjustTest");
const DepthTest = artifacts.require("DepthTest");
const DepthLibrary = artifacts.require("DepthLibrary");
const Secondary = artifacts.require("Secondary");
const YulFnTest = artifacts.require("YulFnTest");

module.exports = async function(deployer) {
  await deployer.deploy(SingleCall);
  await deployer.deploy(NestedCall);
  await deployer.deploy(RevertTest);
  await deployer.deploy(BadTransferTest);
  await deployer.deploy(AdjustTest);
  await deployer.deploy(YulFnTest);
  await deployer.deploy(DepthLibrary);
  await deployer.link(DepthLibrary, DepthTest);
  await deployer.deploy(Secondary);
  const secondary = await Secondary.deployed();
  await deployer.deploy(DepthTest, secondary.address);
};
`;

let migrations = {
  "2_deploy_contracts.js": __MIGRATION
};

let sources = {
  "SingleCall.sol": __SINGLE_CALL,
  "NestedCall.sol": __NESTED_CALL,
  "FailedCall.sol": __FAILED_CALL,
  "AdjustTest.sol": __ADJUSTMENT,
  "BadTransfer.sol": __OVER_TRANSFER,
  "DepthTest.sol": __COMPLEX_CALLS,
  "YulFnTest.yul": __CALL_YUL
};

describe("Source mapping (location and jumps)", function () {
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

    let prepared = await prepareContracts(provider, sources, migrations);
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;
  });

  it("exposes functionality to stop at breakpoints", async function () {
    // prepare
    let instance = await abstractions.NestedCall.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });

    // at `second();`
    let source = bugger.view(sourcemapping.current.source);
    let breakLine = lineOf("BREAK", source.source);
    let breakpoint = {
      sourceId: source.id,
      line: breakLine
    };

    await bugger.addBreakpoint(breakpoint);

    do {
      await bugger.continueUntilBreakpoint();

      if (!bugger.view(trace.finished)) {
        let range = bugger.view(sourcemapping.current.sourceRange);
        assert.equal(range.lines.start.line, breakLine);
      }
    } while (!bugger.view(trace.finished));
  });

  it("exposes functionality to stop at specified breakpoints", async function () {
    // prepare
    let instance = await abstractions.NestedCall.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });

    // at `second();`
    let source = bugger.view(sourcemapping.current.source);
    let breakLine = lineOf("BREAK", source.source);
    let breakpoint = { sourceId: source.id, line: breakLine };

    do {
      await bugger.continueUntilBreakpoint([breakpoint]);

      if (!bugger.view(trace.finished)) {
        let range = bugger.view(sourcemapping.current.sourceRange);
        assert.equal(range.lines.start.line, breakLine);
      }
    } while (!bugger.view(trace.finished));
  });

  it("correctly resolves breakpoints", async function () {
    // prepare
    let instance = await abstractions.AdjustTest.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });

    let resolver = bugger.view(controller.breakpoints.resolver);
    let source = bugger.view(sourcemapping.current.source);

    let breakpoints = [];
    let expectedResolutions = [];

    const NUM_TESTS = 4;

    for (let i = 0; i < NUM_TESTS; i++) {
      let inputLine = lineOf("input " + i, source.source);
      breakpoints.push({
        sourceId: source.id,
        line: inputLine
      });
      let outputLine = lineOf("output " + i, source.source);
      expectedResolutions.push(
        outputLine !== -1 //lineOf will return -1 if no such line exists
          ? {
              sourceId: source.id,
              line: outputLine
            }
          : null
      );
    }

    let resolutions = breakpoints.map(resolver);
    assert.deepEqual(resolutions, expectedResolutions);
  });

  describe("Function Depth", function () {
    it("remains at 0 in absence of inner function calls", async function () {
      const instance = await abstractions.SingleCall.deployed();
      const receipt = await instance.run(1);
      const txHash = receipt.tx;

      const bugger = await Debugger.forTx(txHash, {
        provider,
        compilations,
        lightMode: true
      });

      do {
        await bugger.stepNext();
        //note that we use stepNext, which skips internal sources...
        //it may go above 0 while inside an internal source

        const depth = bugger.view(sourcemapping.current.functionDepth);

        assert.equal(depth, 0);
      } while (!bugger.view(trace.finished));
    });

    it("is unaffected by precompiles", async function () {
      const numExpected = 0;

      let instance = await abstractions.SingleCall.deployed();
      let receipt = await instance.runSha();
      let txHash = receipt.tx;

      let bugger = await Debugger.forTx(txHash, {
        provider,
        compilations,
        lightMode: true
      });

      while (!bugger.view(trace.finished)) {
        let depth = bugger.view(sourcemapping.current.functionDepth);
        assert.equal(depth, numExpected);

        await bugger.stepNext();
      }
    });

    //NOTE: this is same as previous test except for the transaction run;
    //not bothering to factor for now
    it("is unaffected by overly large transfers", async function () {
      const numExpected = 0;

      let instance = await abstractions.BadTransferTest.deployed();
      //HACK: because this transaction fails, we have to extract the hash from
      //the resulting exception (there is supposed to be a non-hacky way but it
      //does not presently work)
      let txHash;
      try {
        await instance.run(); //this will throw because of the revert
      } catch (error) {
        txHash = error.receipt.transactionHash;
      }
      assert.isDefined(txHash, "should have errored and set txHash");

      let bugger = await Debugger.forTx(txHash, {
        provider,
        compilations,
        lightMode: true
      });

      while (!bugger.view(trace.finished)) {
        let depth = bugger.view(sourcemapping.current.functionDepth);
        assert.equal(depth, numExpected);

        await bugger.stepNext();
      }
    });

    it("spelunks correctly", async function () {
      // prepare
      let instance = await abstractions.NestedCall.deployed();
      let receipt = await instance.run();
      let txHash = receipt.tx;

      let bugger = await Debugger.forTx(txHash, {
        provider,
        compilations,
        lightMode: true
      });

      // follow functionDepth values in list
      // see source above
      let expectedDepthSequence = [0, 1, 2, 1, 0, 1, 0];
      let actualSequence = [bugger.view(sourcemapping.current.functionDepth)];

      var finished;

      do {
        await bugger.stepNext();
        finished = bugger.view(trace.finished);

        let currentDepth = bugger.view(sourcemapping.current.functionDepth);
        let lastKnown = actualSequence[actualSequence.length - 1];

        if (currentDepth !== lastKnown) {
          actualSequence.push(currentDepth);
        }
      } while (!finished);

      assert.deepEqual(actualSequence, expectedDepthSequence);
    });

    it("unwinds correctly on call failure", async function () {
      // prepare
      let instance = await abstractions.RevertTest.deployed();
      let receipt = await instance.run();
      let txHash = receipt.tx;

      let bugger = await Debugger.forTx(txHash, {
        provider,
        compilations,
        lightMode: true
      });

      let source = bugger.view(sourcemapping.current.source);
      let breakLine1 = lineOf("BREAK #1", source.source);
      let breakpoint1 = {
        sourceId: source.id,
        line: breakLine1
      };
      await bugger.addBreakpoint(breakpoint1);
      let breakLine2 = lineOf("BREAK #2", source.source);
      let breakpoint2 = {
        sourceId: source.id,
        line: breakLine2
      };
      await bugger.addBreakpoint(breakpoint2);

      await bugger.continueUntilBreakpoint();
      let depthBefore = bugger.view(sourcemapping.current.functionDepth);
      await bugger.continueUntilBreakpoint();
      let depthAfter = bugger.view(sourcemapping.current.functionDepth);

      assert.equal(depthAfter, depthBefore);
    });

    it("counts each external call for 1, not 0 or 2", async function () {
      const instance = await abstractions.DepthTest.deployed();
      const receipt = await instance.run();
      const txHash = receipt.tx;

      const bugger = await Debugger.forTx(txHash, {
        provider,
        compilations,
        lightMode: true
      });

      let hasReachedTwo = false;

      do {
        await bugger.stepNext();
        //note that we use stepNext, which skips internal sources...
        //it may go above 2 while inside an internal source

        const depth = bugger.view(sourcemapping.current.functionDepth);

        assert.isAtMost(depth, 2);
        if (depth === 2) {
          hasReachedTwo = true;
        }
      } while (!bugger.view(trace.finished));
      assert(hasReachedTwo);
    });

    it("counts each external call for 1 in fallback", async function () {
      const instance = await abstractions.DepthTest.deployed();
      const receipt = await instance.sendTransaction({ data: "0xdeadbeef" });
      const txHash = receipt.tx;

      const bugger = await Debugger.forTx(txHash, {
        provider,
        compilations,
        lightMode: true
      });

      let hasReachedTwo = false;

      do {
        await bugger.stepNext();
        //note that we use stepNext, which skips internal sources...
        //it may go above 2 while inside an internal source

        const depth = bugger.view(sourcemapping.current.functionDepth);

        assert.isAtMost(depth, 2);
        if (depth === 2) {
          hasReachedTwo = true;
        }
      } while (!bugger.view(trace.finished));
      assert(hasReachedTwo);
    });

    it("counts each external call for 1 in constructor", async function () {
      const secondary = await abstractions.Secondary.deployed();
      const instance = await abstractions.DepthTest.new(secondary.address);
      const txHash = instance.transactionHash;

      const bugger = await Debugger.forTx(txHash, {
        provider,
        compilations,
        lightMode: true
      });

      let hasReachedTwo = false;

      do {
        await bugger.stepNext();
        //note that we use stepNext, which skips internal sources...
        //it may go above 2 while inside an internal source

        const depth = bugger.view(sourcemapping.current.functionDepth);

        assert.isAtMost(depth, 2);
        if (depth === 2) {
          hasReachedTwo = true;
        }
      } while (!bugger.view(trace.finished));
      assert(hasReachedTwo);
    });

    it("counts each function call in Yul", async function () {
      const instance = await abstractions.YulFnTest.deployed();
      const receipt = await instance.sendTransaction();
      const txHash = receipt.tx;

      const bugger = await Debugger.forTx(txHash, {
        provider,
        compilations,
        lightMode: true
      });

      const source = bugger.view(sourcemapping.current.source);
      const breakLine = lineOf("BREAK", source.source);
      const breakpoint = {
        sourceId: source.id,
        line: breakLine
      };

      await bugger.addBreakpoint(breakpoint);
      await bugger.continueUntilBreakpoint();

      assert.equal(bugger.view(sourcemapping.current.functionDepth), 1);
    });
  });
});
