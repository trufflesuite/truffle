var assert = require("assert");
var solc = require("solc");
var Schema = require("../");
var debug = require("debug")("test:solc");

describe("solc", function() {
  var exampleSolidity = "contract A { function doStuff() {} } \n\n contract B { function somethingElse() {} }";

  it("processes solc compile output correctly", function(done) {
    this.timeout(10000);
    var result = solc.compile(exampleSolidity, 1);

    var data = result.contracts[":A"];

    var A = Schema.normalize(data);

    assert.deepEqual(A.abi, JSON.parse(data.interface));
    assert.equal(A.bytecode, "0x" + data.bytecode);
    assert.equal(A.deployedBytecode, "0x" + data.runtimeBytecode);
    assert.equal(A.sourceMap, data.srcmap);
    assert.equal(A.deployedSourceMap, data.srcmapRuntime);

    done();
  });

  it("processes solc compileStandard output correctly", function(done) {
    this.timeout(5000);

    var solcIn = JSON.stringify({
      language: "Solidity",
      sources: {
        "A.sol": {
          "content": exampleSolidity
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
              "evm.deployedBytecode.sourceMap"
            ]
          }
        }
      }
    });
    var solcOut = JSON.parse(solc.compileStandard(solcIn));

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

    Object.keys(expected).forEach(function (key)  {
      var expectedValue = expected[key];
      var actualValue = A[key];

      assert.deepEqual(
        actualValue, expectedValue,
        "Mismatched schema output for key `" + key + "` (" +
        JSON.stringify(actualValue) + " != " + JSON.stringify(expectedValue) +
        ")"
      );
    });

    // throws error if invalid
    Schema.validate(A);
    done();
  });
});
