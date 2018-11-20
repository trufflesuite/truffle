var assert = require("assert");
var solc = require("solc");
var Schema = require("../");
var debug = require("debug")("test:solc"); // eslint-disable-line no-unused-vars

describe("solc", function() {
  var exampleSolidity = `pragma solidity ^0.5.0;

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

  it("processes solc standard JSON output correctly", function(done) {
    this.timeout(5000);

    var solcIn = JSON.stringify({
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
              "evm.bytecode.object",
              "evm.bytecode.sourceMap",
              "evm.deployedBytecode.object",
              "evm.deployedBytecode.sourceMap",
              "devdoc",
              "userdoc"
            ]
          }
        }
      }
    });
    var solcOut = JSON.parse(solc.compile(solcIn));

    // contracts now grouped by solidity source file
    var rawA = solcOut.contracts["A.sol"].A;

    var A = Schema.normalize(rawA);

    var expected = {
      abi: rawA.abi,
      bytecode: "0x" + rawA.evm.bytecode.object,
      deployedBytecode: "0x" + rawA.evm.deployedBytecode.object,
      sourceMap: rawA.evm.bytecode.sourceMap,
      deployedSourceMap: rawA.evm.deployedBytecode.sourceMap
    };

    Object.keys(expected).forEach(function(key) {
      var expectedValue = expected[key];
      var actualValue = A[key];

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

    // throws error if invalid
    Schema.validate(A);
    done();
  });
});
