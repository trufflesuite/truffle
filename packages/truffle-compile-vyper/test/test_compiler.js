const path = require("path");
const assert = require("assert");
const colors = require("colors");
const exec = require("child_process").exec;

const Config = require("truffle-config");
const compile = require("../index");

describe("vyper compiler", function() {
  this.timeout(10000);

  const config = new Config().merge({
    contracts_directory: path.join(__dirname, "./sources/"),
    quiet: true,
    all: true
  });

  it("compiles vyper contracts", function(done) {
    compile.all(config, function(err, contracts, paths) {
      assert.equal(err, null, "Compiles without error");

      paths.forEach(function(path) {
        assert(
          [".vy", ".v.py", ".vyper.py"].some(
            extension => path.indexOf(extension) !== -1
          ),
          "Paths have only vyper files"
        );
      });

      const hex_regex = /^[x0-9a-fA-F]+$/;

      [
        contracts.VyperContract1,
        contracts.VyperContract2,
        contracts.VyperContract3
      ].forEach((contract, index) => {
        assert.notEqual(
          contract,
          undefined,
          `Compiled contracts have VyperContract${index + 1}`
        );
        assert.equal(
          contract.contract_name,
          `VyperContract${index + 1}`,
          "Contract name is set correctly"
        );

        assert.notEqual(
          contract.abi.indexOf("vyper_action"),
          -1,
          "ABI has function from contract present"
        );

        assert(
          hex_regex.test(contract.bytecode),
          "Bytecode has only hex characters"
        );
        assert(
          hex_regex.test(contract.deployedBytecode),
          "Deployed bytecode has only hex characters"
        );

        assert.equal(
          contract.compiler.name,
          "vyper",
          "Compiler name set correctly"
        );
      });

      done();
    });
  });

  it("compiles with source_map option", function(done) {
    // this test pass when vyper 0.1.0-b9 or higher
    exec("vyper --version", function(err, stdout) {
      let version;
      if (!err) version = stdout.trim();

      if (version === "0.1.0-b9") {
        config.merge({
          vyper: {
            source_map: true
          }
        });
        compile.all(config, function(err, contracts) {
          [
            contracts.VyperContract1,
            contracts.VyperContract2,
            contracts.VyperContract3
          ].forEach((contract, index) => {
            assert(
              contract.sourceMap,
              `source map have to not be empty. ${index + 1}`
            );
          });

          done();
        });
      } else {
        done();
        console.log(
          `${colors.cyan("Skip cause vyper version is lower:")}${version}`
        );
      }
    });
  });

  it("skips solidity contracts", function(done) {
    compile.all(config, function(err, contracts, paths) {
      assert.equal(err, null, "Compiles without error");

      paths.forEach(function(path) {
        assert.equal(path.indexOf(".sol"), -1, "Paths have no .sol files");
      });

      assert.equal(
        contracts.SolidityContract,
        undefined,
        "Compiled contracts have no SolidityContract"
      );

      done();
    });
  });
});
