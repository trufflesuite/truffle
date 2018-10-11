import debugModule from "debug";
const debug = debugModule("test:precompiles");

import { assert } from "chai";

import Ganache from "ganache-cli";
import Web3 from "web3";

import { prepareContracts } from "./helpers";
import Debugger from "lib/debugger";

import evm from "lib/evm/selectors";
import trace from "lib/trace/selectors";
import solidity from "lib/solidity/selectors";

const __PRECOMPILE = `
pragma solidity ^0.4.18;

contract HasPrecompile {
  event Called();

  function run() public {
    sha256("hello world");

    emit Called();
  }
}
`;

let sources = {
  "HasPrecompile.sol": __PRECOMPILE,
}

const TEST_CASES = [{
  name: "trace.step",
  selector: trace.step
}, {
  name: "evm.current.context",
  selector: evm.current.context
}, {
  name: "solidity.current.sourceRange",
  selector: solidity.current.sourceRange
}];

describe("Precompiled Contracts", () => {
  let provider;
  let web3;

  let abstractions;
  let artifacts;
  let files;

  // object where key is selector name, value is list of results at step
  let results = {};

  before("Create Provider", async function() {
    provider = Ganache.provider({seed: "debugger", gasLimit: 7000000});
    web3 = new Web3(provider);
  });

  before("Prepare contracts and artifacts", async function() {
    this.timeout(30000);

    let prepared = await prepareContracts(provider, sources)
    abstractions = prepared.abstractions;
    artifacts = prepared.artifacts;
    files = prepared.files;
  });

  before("Initialize results", () => {
    // initialize results as mapping of selector to step results list
    for (let { name } of TEST_CASES) {
      results[name] = [];
    }
  });

  before("Step through debugger", async function() {
    let instance = await abstractions.HasPrecompile.deployed();
    let receipt = await instance.run();
    let txHash = receipt.tx;

    let bugger = await Debugger.forTx(txHash, {
      provider,
      files,
      contracts: artifacts
    });

    let session = bugger.connect();
    var stepped;  // session steppers return false when done

    do {
      for (let { name, selector } of TEST_CASES) {
        let stepResult;

        try {
          stepResult = { value: session.view(selector) };
        } catch (e) {
          stepResult = { error: e };
        }

        results[name].push(stepResult);
      }

      stepped = session.advance();
    } while(stepped);
  });

  before("remove final step results", () => {
    // since these include one step past end of trace
    for (let { name } of TEST_CASES) {
      results[name].pop();
    }
  });

  it("never fails to know the trace step", async () => {
    // remove last item (known to be undefined)
    const result = results["trace.step"];

    for (let step of result) {
      if (step.error) {
        throw step.error;
      }

      assert.isOk(step.value);
    }
  });

  it("never fails to know EVM context", async () => {
    const result = results["evm.current.context"];

    for (let step of result) {
      if (step.error) {
        throw step.error;
      }

      assert.isOk(step.value);
      assert.property(step.value, "context");
    }
  });

  it("never throws an exception for missing source range", async () => {
    const result = results["solidity.current.sourceRange"];

    for (let step of result) {
      if (step.error) {
        throw step.error;
      }

      assert.isOk(step.value);
    }
  });
});
