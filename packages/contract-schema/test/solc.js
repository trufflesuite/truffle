const assert = require("assert");
const solc = require("solc");
const Schema = require("../");
const debug = require("debug")("test:solc");

describe("solc", function () {
  const exampleSolidity = `// SPDX-License-Identifier: MIT
  pragma solidity ^0.8.0;

  contract A {
    uint x;

    function doStuff() public {
      x = 5;
    }
  }

  contract B {
    function somethingElse() public pure {}
  }
  `;

  it("processes solc standard JSON output correctly", function () {
    this.timeout(5000);

    const solcIn = JSON.stringify({
      language: "Solidity",
      sources: {
        "A.sol": {
          content: exampleSolidity
        }
      },
      settings: {
        outputSelection: {
          "*": {
            "*": [
              "abi",
              "metadata",
              "evm.bytecode.object",
              "evm.bytecode.sourceMap",
              "evm.deployedBytecode.object",
              "evm.deployedBytecode.sourceMap",
              "devdoc",
              "userdoc"
            ],
            "": ["ast", "legacyAST"]
          }
        }
      }
    });
    const solcOut = JSON.parse(solc.compile(solcIn));

    debug("solcOut: %O", solcOut);

    const rawA = Object.assign(
      {},
      solcOut.contracts["A.sol"].A, // contracts now grouped by solidity source file
      solcOut.sources["A.sol"]
    );

    const A = Schema.normalize(rawA);

    const expected = {
      abi: rawA.abi,
      metadata: rawA.metadata,
      bytecode: "0x" + rawA.evm.bytecode.object,
      deployedBytecode: "0x" + rawA.evm.deployedBytecode.object,
      sourceMap: rawA.evm.bytecode.sourceMap,
      deployedSourceMap: rawA.evm.deployedBytecode.sourceMap,
      devdoc: rawA.devdoc,
      userdoc: rawA.userdoc
    };

    Object.keys(expected).forEach(function (key) {
      const expectedValue = expected[key];
      const actualValue = A[key];

      assert.deepEqual(
        actualValue,
        expectedValue,
        "Mismatched schema output for key `" +
          key +
          "` (" +
          JSON.stringify(actualValue) +
          " != " +
          JSON.stringify(expectedValue) +
          ")"
      );
    });

    //check that ast has the correct form
    assert.equal(A.ast.nodeType, "SourceUnit");

    // throws error if invalid
    Schema.validate(A);
  });
});
