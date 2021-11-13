const debug = require("debug")("compile:test:test_oldversions");
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
      version: "0.4.9",
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

describe("Compile - solidity <0.4.20", function () {
  this.timeout(5000); // solc
  let source = null;
  let solc = null; // gets loaded via supplier

  before("get solc", async function () {
    this.timeout(40000);

    const supplier = new CompilerSupplier(supplierOptions);
    ({ solc } = await supplier.load());
  });

  describe("Output repair", function () {
    before("get code", function () {
      source = fs.readFileSync(
        path.join(__dirname, "./sources/v0.4.9/FilenameWith:Colon.sol"),
        "utf-8"
      );
    });

    it("produces contract output correctly", async function () {
      const sourcePath = `${workingDirectory}/contracts/FilenameWith:Colon.sol`;
      const sources = { [sourcePath]: source };

      const { compilations } = await Compile.sources({
        sources,
        options: compileOptions
      });
      //there should be one compilation
      assert.equal(compilations.length, 1);
      const compilation = compilations[0];
      //it should have contracts
      assert.ok(compilation.contracts);
      //there should be one
      assert.equal(compilation.contracts.length, 1);
      const contract = compilation.contracts[0];
      //it should have contract name & source set correctly;
      //it should have various other properties set at all
      assert.equal(contract.contractName, "SimpleContract");
      assert.equal(contract.sourcePath, sourcePath);
      assert.equal(contract.source, source);
      assert.ok(contract.bytecode);
      assert.ok(contract.abi);
      assert.ok(contract.legacyAST);
    });
  });
});
