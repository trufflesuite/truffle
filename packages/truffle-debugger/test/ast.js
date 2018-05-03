import debugModule from "debug";
const debug = debugModule("test:ast");

import { assert } from "chai";

import Ganache from "ganache-cli";
import Web3 from "web3";

import { prepareContracts } from "./helpers";
import Debugger from "lib/debugger";

import ast from "lib/ast/selectors";
import solidity from "lib/solidity/selectors";

import { getRange, findRange, rangeNodes } from "lib/ast/map";

const __VARIABLES = `
pragma solidity ^0.4.18;

contract Variables {
  event Result(uint256 result);

  uint256 qux;
  string quux;

  function stack(uint256 foo) public returns (uint256) {
    uint256 bar = foo + 1;
    uint256 baz = innerStack(bar);

    baz += 4;

    qux = baz;

    Result(baz);

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
}

describe("AST", function() {
  var provider;
  var web3;

  var abstractions;
  var artifacts;
  var files;

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

  describe("Node pointer", function() {
    it("traverses", async function() {
      this.timeout(0);
      let instance = await abstractions.Variables.deployed();
      let receipt = await instance.stack(4);
      let txHash = receipt.tx;

      let bugger = await Debugger.forTx(txHash, {
        provider,
        files,
        contracts: artifacts
      });

      let session = bugger.connect();
      debug("ast: %O", session.view(ast.current.tree));

      do {
        let { start, length } = session.view(solidity.current.sourceRange);
        let end = start + length;

        let node = session.view(ast.current.node);

        let [ nodeStart, nodeLength ] = getRange(node);
        let nodeEnd = nodeStart + nodeLength;

        let pointer = session.view(ast.current.pointer);

        assert.isAtMost(
          nodeStart, start,
          `Node ${pointer} at should not begin after instruction source range`
        );
        assert.isAtLeast(
          nodeEnd, end,
          `Node ${pointer} should not end after source`
        );

        session.stepNext();
      } while(!session.finished);

    });
  });
});
