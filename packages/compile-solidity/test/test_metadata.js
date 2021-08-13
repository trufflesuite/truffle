const debug = require("debug")("compile:test:test_metadata");
const fs = require("fs");
const path = require("path");
const { Compile } = require("@truffle/compile-solidity");
const { CompilerSupplier } = require("../dist/compilerSupplier");
const assert = require("assert");
const { findOne } = require("./helpers");
const workingDirectory = "/home/fakename/truffleproject";
const compileOptions = {
  working_directory: workingDirectory,
  compilers: {
    solc: {
      version: "0.4.25",
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
const supplierOptions = {
  solcConfig: compileOptions.compilers.solc,
  events: {
    emit: () => {}
  }
};

describe("Compile - solidity ^0.4.0", function () {
  this.timeout(5000); // solc
  let source = null;
  let solc = null; // gets loaded via supplier

  before("get solc", async function () {
    this.timeout(40000);

    const supplier = new CompilerSupplier(supplierOptions);
    ({ solc } = await supplier.load());
  });

  describe("Metadata", function () {
    before("get code", function () {
      source = fs.readFileSync(
        path.join(__dirname, "./sources/v0.4.x/SimpleOrdered.sol"),
        "utf-8"
      );
    });

    it("does not include absolute paths in metadata", async function () {
      const sourcePath = `${workingDirectory}/contracts/SimpleOrdered.sol`;
      const sources = { [sourcePath]: source };

      const { compilations } = await Compile.sources({
        sources,
        options: compileOptions
      });

      const SimpleOrdered = findOne("SimpleOrdered", compilations[0].contracts);
      const metadata = JSON.parse(SimpleOrdered.metadata);
      const metadataSources = Object.keys(metadata.sources);
      const metadataTargets = Object.keys(metadata.settings.compilationTarget);
      const metadataPaths = metadataSources.concat(metadataTargets);
      debug("metadataPaths: %O", metadataPaths);
      assert(metadataPaths.every(
        sourcePath => sourcePath.startsWith("project:/") &&
          !sourcePath.includes(workingDirectory)
      ));
    });
  });
});
