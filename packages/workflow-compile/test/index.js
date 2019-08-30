const Contracts = require("../new");
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

describe("Contracts.compile", () => {
  it("throws when attempting to compile with an unsupported compiler", async () => {
    config.compiler = "unsupportedCompiler";

    try {
      await Contracts.compile(config);
      assert.fail("Expected an error!");
    } catch (err) {
      assert(err.message.includes("Unsupported compiler"));
    }
  });

  describe("when config.all is true", () => {
    it("recompiles all contracts in contracts_directory", async () => {
      // initial compile
      const { contracts } = await Contracts.compile(config);
      await Contracts.save(config, contracts);

      let contractName = contracts[0].contractName;
      assert(
        existsSync(`${config.contracts_build_directory}/${contractName}.json`)
      );

      // compile again
      config.all = true;
      const { compilations } = await Contracts.compile(config);
      await Contracts.save(config, contracts);

      assert(
        compilations.solc.sourceIndexes[0] ===
          join(
            `${process.cwd()}/${config.contracts_directory}/${contractName}.sol`
          )
      );
    }).timeout(3000);
  });
});
