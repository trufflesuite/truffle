import debugModule from "debug";
const debug = debugModule("test:ast");

import { assert } from "chai";

import Ganache from "ganache-core";

import { prepareContracts } from "./helpers";
import Debugger from "lib/debugger";

import solidity from "lib/solidity/selectors";
import trace from "lib/trace/selectors";

import { getRange } from "lib/ast/map";

const __VARIABLES = `
pragma solidity ~0.5;

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

describe("AST", function() {
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

  describe("Node pointer", function() {
    it("traverses", async function() {
      this.timeout(6000);
      let instance = await abstractions.Variables.deployed();
      let receipt = await instance.stack(4);
      let txHash = receipt.tx;

      let bugger = await Debugger.forTx(txHash, {
        provider,
        files,
        contracts: artifacts
      });

      let session = bugger.connect();

      do {
        let { start, length } = session.view(solidity.current.sourceRange);
        let end = start + length;

        let node = session.view(solidity.current.node);

        let [nodeStart, nodeLength] = getRange(node);
        let nodeEnd = nodeStart + nodeLength;

        let pointer = session.view(solidity.current.pointer);

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

        await session.stepNext();
      } while (!session.view(trace.finished));
    });
  });
});
