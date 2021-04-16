const debug = require("debug")("compile:test:test_yul");
const path = require("path");
const { Compile } = require("@truffle/compile-solidity");
const assert = require("assert");
const Resolver = require("@truffle/resolver");

describe("Yul compilation", function () {
  this.timeout(5000); // solc

  const options = {
    working_directory: __dirname,
    contracts_directory: path.join(__dirname, "./sources/yul"),
    contracts_build_directory: path.join(__dirname, "./does/not/matter"), //nothing is actually written, but resolver demands it
    compilers: {
      solc: {
        version: "0.6.8",
        settings: {
          optimizer: {
            enabled: false,
            runs: 200
          }
        }
      }
    },
    quiet: true
  };
  options.resolver = new Resolver(options);

  it("Compiles both Solidty and Yul", async function () {
    this.timeout(90000);
    const paths = [
      "SoliditySource.sol",
      "YulSource1.yul",
      "YulSource2.yul"
    ].map(filePath => path.join(options.contracts_directory, filePath));

    const { compilations } = await Compile.sourcesWithDependencies({
      paths,
      options
    });

    //are there 3 compilations?
    assert.equal(compilations.length, 3);
    //do all compilations have sources?
    assert.ok(compilations.every(compilation => compilation.sources));
    assert.ok(
      compilations.every(compilation => compilation.sources.length === 1)
    );
    //do all compilations have contracts?
    assert.ok(compilations.every(compilation => compilation.contracts));
    assert.ok(
      compilations.every(compilation => compilation.contracts.length === 1)
    );
    //do they all have compiler?
    assert.ok(compilations.every(compilation => compilation.compiler));
    //is first compilation Solidity?
    assert.equal(compilations[0].sources[0].language, "Solidity");
    //are the other two Yul?
    assert.equal(compilations[1].sources[0].language, "Yul");
    assert.equal(compilations[2].sources[0].language, "Yul");
    //do they all have contents and sourcePath?
    assert.ok(
      compilations.every(compilation => compilation.sources[0].contents)
    );
    assert.ok(
      compilations.every(compilation => compilation.sources[0].sourcePath)
    );
    //do they all have a contract name?
    assert.ok(
      compilations.every(compilation => compilation.contracts[0].contractName)
    );
    //do they all have an ABI?
    assert.ok(compilations.every(compilation => compilation.contracts[0].abi));
    //does the Solidity source have non-empty ABI?
    assert.notEqual(compilations[0].contracts[0].abi.length, 0);
    //does the Yul sources have empty ABI?
    assert.equal(compilations[1].contracts[0].abi.length, 0);
    assert.equal(compilations[2].contracts[0].abi.length, 0);
    //do they all have constructor bytecode?
    assert.ok(
      compilations.every(compilation => compilation.contracts[0].bytecode.bytes)
    );
    //do they all have source & sourcePath?
    assert.ok(
      compilations.every(compilation => compilation.contracts[0].source)
    );
    assert.ok(
      compilations.every(compilation => compilation.contracts[0].sourcePath)
    );
    //do they all have a source map?
    assert.ok(
      compilations.every(compilation => compilation.contracts[0].sourceMap)
    );
  });
});
