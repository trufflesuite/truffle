const debug = require("debug")("compile:test:test_metadata");
const tmp = require("tmp");
tmp.setGracefulCleanup();
const fs = require("fs");
const path = require("path");
const { Compile, CompilerSupplier } = require("@truffle/compile-solidity");
const { Resolver } = require("@truffle/resolver");
const assert = require("assert");
const { findOne } = require("./helpers");
const solcConfig = {
  version: "0.4.25",
  settings: {
    optimizer: {
      enabled: false,
      runs: 200
    }
  }
};
const supplierOptions = {
  solcConfig,
  events: {
    emit: () => {}
  }
};

describe("Compile - solidity ^0.4.0", function () {
  this.timeout(5000); // solc // gets loaded via supplier
  let options;

  before("get solc", async function () {
    this.timeout(40000);

    const supplier = new CompilerSupplier(supplierOptions);
    await supplier.load();
  });

  describe("Metadata", function () {
    let sourcePath;
    let tmpdir;

    before("Set up temporary directory and project", async function () {
      tmpdir = tmp.dirSync({ unsafeCleanup: true }).name; //tmp uses callbacks, not promises, so using sync
      await fs.promises.mkdir(path.join(tmpdir, "./contracts"));
      const contracts_directory = path.join(tmpdir, "./contracts");
      options = {
        working_directory: tmpdir,
        contracts_directory,
        contracts_build_directory: path.join(tmpdir, "./build/contracts"), //nothing is actually written, but resolver demands it
        compilers: {
          solc: solcConfig
        },
        quiet: true
      };
      options.resolver = new Resolver(options);
      sourcePath = path.join(options.contracts_directory, "SimpleOrdered.sol");
      await fs.promises.copyFile(
        path.join(__dirname, "./sources/v0.4.x/SimpleOrdered.sol"),
        sourcePath
      );
    });

    it("does not include absolute paths in metadata", async function () {
      const { compilations } = await Compile.sourcesWithDependencies({
        paths: [sourcePath],
        options
      });

      const SimpleOrdered = findOne("SimpleOrdered", compilations[0].contracts);
      const metadata = JSON.parse(SimpleOrdered.metadata);
      const metadataSources = Object.keys(metadata.sources);
      const metadataTargets = Object.keys(metadata.settings.compilationTarget);
      const metadataPaths = metadataSources.concat(metadataTargets);
      debug("metadataPaths: %O", metadataPaths);
      assert(
        metadataPaths.every(
          sourcePath =>
            sourcePath.startsWith("project:/") && !sourcePath.includes(tmpdir)
        )
      );
    });
  });
});
