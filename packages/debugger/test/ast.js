import debugModule from "debug";
const debug = debugModule("debugger:test:ast");

import { assert } from "chai";

import Ganache from "ganache";

import { prepareContracts, testBlockGasLimit } from "./helpers";
import Debugger from "lib/debugger";

import sourcemapping from "lib/sourcemapping/selectors";
import trace from "lib/trace/selectors";

import SourceMapUtils from "@truffle/source-map-utils";

const __VARIABLES = `
pragma solidity ^0.8.0;

contract Variables {
  event Result(uint256 result);

  uint256 qux;
  string quux;

  function stack(uint256 foo) public returns (uint256) {
    uint256 bar = foo + 1;
    uint256 baz = innerStack(bar);

    baz += 4;

    qux = baz;

    emit Result(baz);

    return baz;
  }

  function innerStack(uint256 baz) public returns (uint256) {
    uint256 bar = baz + 2;
    return bar;
  }
}
`;

let sources = {
  "Variables.sol": __VARIABLES
};

describe("AST", function () {
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
    this.timeout(50000);

    let prepared = await prepareContracts(provider, sources);
    abstractions = prepared.abstractions;
    compilations = prepared.compilations;
  });

  describe("Node pointer", function () {
    it("traverses", async function () {
      this.timeout(6000);
      let instance = await abstractions.Variables.deployed();
      let receipt = await instance.stack(4);
      let txHash = receipt.tx;

      let bugger = await Debugger.forTx(txHash, {
        provider,
        compilations,
        lightMode: true
      });

      do {
        let { start, length } = bugger.view(sourcemapping.current.sourceRange);
        let end = start + length;

        let node = bugger.view(sourcemapping.current.node);

        let [nodeStart, nodeLength] = SourceMapUtils.getRange(node);
        let nodeEnd = nodeStart + nodeLength;

        let pointer = bugger.view(sourcemapping.current.pointer);

        assert.isAtMost(
          nodeStart,
          start,
          `Node ${pointer} at should not begin after instruction source range`
        );
        assert.isAtLeast(
          nodeEnd,
          end,
          `Node ${pointer} should not end after source`
        );

        await bugger.stepNext();
      } while (!bugger.view(trace.finished));
    });
  });
});
