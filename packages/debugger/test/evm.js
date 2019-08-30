import debugModule from "debug";
const debug = debugModule("test:evm"); // eslint-disable-line no-unused-vars

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts } from "./helpers";
import Debugger from "lib/debugger";

import evm from "lib/evm/selectors";
import trace from "lib/trace/selectors";

const __OUTER = `
pragma solidity ~0.5;

import "./Inner.sol";

contract Outer {
  event Called();

  Inner inner;

  constructor(address _inner) public {
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
pragma solidity ~0.5;

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

describe("EVM Debugging", function() {
  var provider;

  var abstractions;
  var artifacts;
  var files;

  before("Create Provider", async function() {
    provider = Ganache.provider({ seed: "debugger", gasLimit: 7000000 });
  });

  before("Prepare contracts and artifacts", async function() {
    this.timeout(30000);

    let prepared = await prepareContracts(provider, sources, migrations);
    abstractions = prepared.abstractions;
    artifacts = prepared.artifacts;
    files = prepared.files;
  });

  describe("Function Depth", function() {
    it("remains at 1 in absence of cross-contract calls", async function() {
      const maxExpected = 1;

      let instance = await abstractions.Inner.deployed();
      let receipt = await instance.run();
      let txHash = receipt.tx;

      let bugger = await Debugger.forTx(txHash, {
        provider,
        files,
        contracts: artifacts
      });

      let session = bugger.connect();
      var finished; // is the trace finished?

      do {
        await session.stepNext();
        finished = session.view(trace.finished);

        let actual = session.view(evm.current.callstack).length;

        assert.isAtMost(actual, maxExpected);
      } while (!finished);
    });

    it("tracks callstack correctly", async function() {
      // prepare
      let instance = await abstractions.Outer.deployed();
      let receipt = await instance.run();
      let txHash = receipt.tx;

      let bugger = await Debugger.forTx(txHash, {
        provider,
        files,
        contracts: artifacts
      });

      let session = bugger.connect();

      // follow callstack length values in list
      // see source above
      let expectedDepthSequence = [1, 2, 1];
      let actualSequence = [session.view(evm.current.callstack).length];

      var finished; // is the trace finished?

      do {
        await session.stepNext();
        finished = session.view(trace.finished);

        let currentDepth = session.view(evm.current.callstack).length;
        let lastKnown = actualSequence[actualSequence.length - 1];

        if (currentDepth !== lastKnown) {
          actualSequence.push(currentDepth);
        }
      } while (!finished);

      assert.deepEqual(actualSequence, expectedDepthSequence);
    });
  });
});
