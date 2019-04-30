const Contracts = require("../index");
const assert = require("assert");
const { existsSync } = require("fs");

let config;

beforeEach(() => {
  config = {
    contracts_directory: "./test/sources",
    contracts_build_directory: "./test/build"
  };
});

describe("Contracts.compileSources", () => {
  it("throws when attempting to compile with an unsupported compiler", async () => {
    compilers = ["unsupportedCompiler"];

    try {
      await Contracts.compileSources(config, compilers);
      assert.fail("Expected an error!");
    } catch (err) {
      assert(err.message.includes("Unsupported compiler"));
    }
  });
});

describe("Contracts.compile", () => {
  it("when config.all is true, all contracts in contracts_directory are recompiled", () => {
    let contractName;

    // initial compile
    Contracts.compile(config, (err, { contracts }) => {
      if (err) assert.fail(err);
      else {
        contractName = Object.keys(contracts)[0];
        assert(
          existsSync(`${config.contracts_build_directory}/${contractName}.json`)
        );
      }
    });

    // compile again
    config.all = true;
    Contracts.compile(config, (err, output) => {
      if (err) assert.fail(err);
      else {
        assert(
          output.solc ===
            `${process.cwd()}/${config.contracts_directory}/${contractName}.sol`
        );
      }
    });
  });
});
