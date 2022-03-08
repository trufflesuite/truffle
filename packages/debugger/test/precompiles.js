import debugModule from "debug";
const debug = debugModule("debugger:test:precompiles");

import { assert } from "chai";

import Ganache from "ganache";

import { prepareContracts } from "./helpers";
import Debugger from "lib/debugger";

import evm from "lib/evm/selectors";
import trace from "lib/trace/selectors";
import sourcemapping from "lib/sourcemapping/selectors";

const __PRECOMPILE = `
pragma solidity ^0.8.0;

contract HasPrecompile {
  event Called();

  function run() public {
    sha256("hello world");

    emit Called();
  }
}
`;

let sources = {
  "HasPrecompile.sol": __PRECOMPILE
};

const TEST_CASES = [
  {
    name: "trace.step",
    selector: trace.step
  },
  {
    name: "evm.current.context",
    selector: evm.current.context
  },
  {
    name: "sourcemapping.current.sourceRange",
    selector: sourcemapping.current.sourceRange
  }
];

describe("Precompiled Contracts", function () {
  let provider;
  let abstractions;
  let compilations;

  // object where key is selector name, value is list of results at step
  let results = {};

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

  before("Initialize results", function () {
    // initialize results as mapping of selector to step results list
    for (let { name } of TEST_CASES) {
      results[name] = [];
    }
  });

  before("Step through debugger", async function () {
    let instance = await abstractions.HasPrecompile.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      compilations,
      lightMode: true
    });

    var finished; // is the trace finished?

    do {
      for (let { name, selector } of TEST_CASES) {
        let stepResult;

        try {
          stepResult = { value: bugger.view(selector) };
        } catch (e) {
          stepResult = { error: e };
        }

        results[name].push(stepResult);
      }

      await bugger.advance();
      finished = bugger.view(trace.finished);
    } while (!finished);
  });

  before("remove final step results", function () {
    // since these include one step past end of trace
    for (let { name } of TEST_CASES) {
      results[name].pop();
    }
  });

  it("never fails to know the trace step", async function () {
    // remove last item (known to be undefined)
    const result = results["trace.step"];

    for (let step of result) {
      if (step.error) {
        throw step.error;
      }

      assert.isOk(step.value);
    }
  });

  it("never fails to know EVM context", async function () {
    const result = results["evm.current.context"];

    for (let step of result) {
      if (step.error) {
        throw step.error;
      }

      assert.isOk(step.value);
      assert.property(step.value, "context");
    }
  });

  it("never throws an exception for missing source range", async function () {
    const result = results["sourcemapping.current.sourceRange"];

    for (let step of result) {
      if (step.error) {
        throw step.error;
      }

      assert.isOk(step.value);
    }
  });
});
