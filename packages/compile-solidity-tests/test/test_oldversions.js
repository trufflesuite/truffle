const debug = require("debug")("compile:test:test_oldversions");
const { Compile } = require("@truffle/compile-solidity");
const assert = require("assert");
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

//NOTE: do *not* replace this with an actual .sol
//file named 'FilenameWith:Colon.sol', as that will
//prevent the repo from being checked out on Windows!!
const __OLDCONTRACT = `
//SPDX-License-Identifier: MIT
pragma solidity >=0.4.9 <0.4.20;

contract SimpleContract {
  uint x;

  function SimpleContract() public {
    x = 7;
  }
}
`;

//I've put a colon in the filename to be extra-sure
//that this is indeed testing what it's supposed to
//(that colons in file paths don't screw things up;
//"project:/" should suffice to trigger the issue but
//I want to be extra sure)
const sourcePath = `${workingDirectory}/contracts/FilenameWith:Colon.sol`;
const source = __OLDCONTRACT;
const sources = { [sourcePath]: source };

describe("Compile - solidity <0.4.20", function () {
  describe("Output repair", function () {
    it("produces contract output correctly", async function () {
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
