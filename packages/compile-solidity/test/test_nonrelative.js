const debug = require("debug")("compile:test:test_nonrelative");
const path = require("path");
const { Compile } = require("@truffle/compile-solidity");
const assert = require("assert");
const Resolver = require("@truffle/resolver");
const process = require("process");

describe("Non-relative non-absolute file paths", function () {
  this.timeout(5000); // solc

  const options = {
    working_directory: __dirname,
    contracts_directory: path.join(__dirname, "./sources/badSources"),
    contracts_build_directory: path.join(__dirname, "./does/not/matter"), //nothing is actually written, but resolver demands it
    compilers: {
      solc: {
        version: "0.8.6",
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

  before("Set working directory", function () {
    originalWorkingDirectory = process.cwd();
    process.chdir(options.contracts_directory);
  });

  it("Refuses to compile non-relative non-absolute paths", async function () {
    this.timeout(150000);
    const paths = [
      "Nonrelative.sol",
    ].map(filePath => path.join(options.contracts_directory, filePath));

    debug("current dir: %s", process.cwd());

    try {
      await Compile.sourcesWithDependencies({
        paths,
        options
      });
      assert.fail("Compilation should have failed");
    } catch (error) {
      debug("error: %O", error);
      if(!error.message.includes('Source "Imported.sol" not found')) {
        throw error; //rethrow errors that aren't the one we expect
      }
      //otherwise, we're good
    }
  });

  after("Reset working directory", function () {
    process.chdir(originalWorkingDirectory);
  });
});
