import debugModule from "debug";
const debug = debugModule("compile:test:test_yul");
import * as path from "path";
import { Compile } from "@truffle/compile-solidity";
import { assert } from "chai";
import { Resolver } from "@truffle/resolver";
let options;

describe("Yul compilation", function () {
  this.timeout(5000); // solc

  beforeEach(function () {
    options = {
      working_directory: __dirname,
      contracts_directory: path.join(__dirname, "./sources/yul"),
      contracts_build_directory: path.join(__dirname, "./does/not/matter"), //nothing is actually written, but resolver demands it
      compilers: {
        solc: {
          version: "0.5.17",
          settings: {
            optimizer: {
              enabled: false,
              runs: 200
            }
          }
        }
      },
      quiet: true,
      resolver: undefined
    };
    options.resolver = new Resolver(options);
  });

  it("Compiles Yul", async function () {
    this.timeout(150000);
    const paths = ["YulSource.yul"].map(filePath =>
      path.join(options.contracts_directory, filePath)
    );

    const { compilations } = await Compile.sourcesWithDependencies({
      paths,
      options
    });

    //is there 1 compilation?
    assert.equal(compilations.length, 1);
    //do all compilations have sources?
    assert.ok(compilations[0].sources);
    assert.equal(compilations[0].sources.length, 1);
    //do all compilations have contracts?
    assert.ok(compilations[0].contracts);
    assert.equal(compilations[0].contracts.length, 1);
    //do they all have compiler?
    assert.ok(compilations[0].compiler);
    //are they Yul?
    assert.equal(compilations[0].sources[0].language, "Yul");
    //do they all have contents and sourcePath?
    assert.ok(compilations[0].sources[0].contents);
    assert.ok(compilations[0].sources[0].sourcePath);
    //do they all have a contract name?
    assert.ok(compilations[0].contracts[0].contractName);
    //do they all have an ABI?
    assert.ok(compilations[0].contracts[0].abi);
    //do the Yul sources have empty ABI?
    assert.equal(compilations[0].contracts[0].abi.length, 0);
    //do they all have constructor bytecode?
    assert.ok(compilations[0].contracts[0].bytecode.bytes);
    //do they all have source & sourcePath?
    assert.ok(compilations[0].contracts[0].source);
    assert.ok(compilations[0].contracts[0].sourcePath);
  });
});
