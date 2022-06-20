import debugModule from "debug";
const debug = debugModule("debugger:test:evm");

import { assert } from "chai";

import Ganache from "ganache";

import { prepareContracts, testBlockGasLimit } from "./helpers";
import Debugger from "lib/debugger";

import evm from "lib/evm/selectors";
import trace from "lib/trace/selectors";

const __OUTER = `
pragma solidity ^0.8.0;

import "./Inner.sol";

contract Outer {
  event Called();

  Inner inner;

  constructor(address _inner) {
    inner = Inner(_inner);
  }

  function runSingle() public {
  }

  function run() public {
    inner.run();
  }
}
`;

const __INNER = `
pragma solidity ^0.8.0;

contract Inner {
  function run() public {
  }
}
`;

const __MIGRATION = `
let Outer = artifacts.require("Outer");
let Inner = artifacts.require("Inner");

module.exports = async function(deployer) {
  await deployer.deploy(Inner);
  const inner = await Inner.deployed();
  await deployer.deploy(Outer, inner.address);
};
`;

let sources = {
  "Inner.sol": __INNER,
  "Outer.sol": __OUTER
};

let migrations = {
  "2_deploy_contracts.js": __MIGRATION
};

describe("EVM Debugging", function () {
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

    let prepared = await prepareContracts(provider, sources, migrations);
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;
  });

  describe("Function Depth", function () {
    it("remains at 1 in absence of cross-contract calls", async function () {
      const maxExpected = 1;

      let instance = await abstractions.Inner.deployed();
      let receipt = await instance.run();
      let txHash = receipt.tx;

      let bugger = await Debugger.forTx(txHash, {
        provider,
        compilations,
        lightMode: true
      });

      var finished; // is the trace finished?

      do {
        await bugger.stepNext();
        finished = bugger.view(trace.finished);

        let actual = bugger.view(evm.current.callstack).length;

        assert.isAtMost(actual, maxExpected);
      } while (!finished);
    });

    it("tracks callstack correctly", async function () {
      // prepare
      let instance = await abstractions.Outer.deployed();
      let receipt = await instance.run();
      let txHash = receipt.tx;

      let bugger = await Debugger.forTx(txHash, {
        provider,
        compilations,
        lightMode: true
      });

      // follow callstack length values in list
      // see source above
      let expectedDepthSequence = [1, 2, 1];
      let actualSequence = [bugger.view(evm.current.callstack).length];

      var finished; // is the trace finished?

      do {
        await bugger.stepNext();
        finished = bugger.view(trace.finished);

        let currentDepth = bugger.view(evm.current.callstack).length;
        let lastKnown = actualSequence[actualSequence.length - 1];

        if (currentDepth !== lastKnown) {
          actualSequence.push(currentDepth);
        }
      } while (!finished);

      assert.deepEqual(actualSequence, expectedDepthSequence);
    });
  });
});
