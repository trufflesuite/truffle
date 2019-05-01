const Contracts = require("../index");
const assert = require("assert");
const { existsSync, removeSync } = require("fs-extra");
const { join } = require("path");

let config;

beforeEach(() => {
  config = {
    contracts_directory: "./test/sources",
    contracts_build_directory: "./test/build",
    logger: {
      log(stringToLog) {
        this.loggedStuff = this.loggedStuff + stringToLog;
      },
      loggedStuff: ""
    }
  };
});

after(() => {
  removeSync(join(`${process.cwd()}/${config.contracts_build_directory}`));
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
  it("when config.all is true, all contracts in contracts_directory are recompiled", async () => {
    let contractName;

    // initial compile
    await Contracts.compile(config, (err, { contracts }) => {
      if (err) assert.fail(err);
      contractName = Object.keys(contracts)[0];
      assert(
        existsSync(`${config.contracts_build_directory}/${contractName}.json`)
      );
    });

    // compile again
    config.all = true;
    await Contracts.compile(config, (err, { outputs }) => {
      if (err) assert.fail(err);
      assert(
        outputs.solc[0] ===
          join(
            `${process.cwd()}/${config.contracts_directory}/${contractName}.sol`
          )
      );
    });
  });
});
