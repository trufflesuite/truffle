const path = require("path");
const assert = require("assert");
const Config = require("@truffle/config");
const compile = require("../index");

describe("smartpy compiler", () => {
  const defaultSettings = {
    contracts_directory: path.join(__dirname, "./sources/"),
    contracts_build_directory: path.join(__dirname, "./build/"),
    quiet: true,
    all: true,
    _: []
  };
  const config = new Config().merge(defaultSettings);

  it("compiles smartpy contracts", done => {
    compile.all(config, (err, contracts, paths) => {
      assert.equal(err, null, `Compiles with an error!: \n\n${err}`);

      paths.forEach(path => {
        assert(
          [".py"].some(extension => path.indexOf(extension) !== -1),
          "Paths should only include smartpy files (.py)"
        );
      });

      [contracts.SmartPyContract1].forEach((contract, index) => {
        assert.notEqual(
          contract,
          undefined,
          `Compiled contract should be SmartPyContract${index + 1}`
        );

        assert.equal(
          contract.contractName,
          `SmartPyContract${index + 1}`,
          "Contract name is set incorrectly"
        );

        assert.equal(
          contract.abi.length,
          0,
          "SmartPy compiler doesn't currently output contract ABI, something is amiss!"
        );

        assert(
          contract.initialStorage,
          "Contract initial storage stored improperly, something is wrong!"
        );

        assert(
          /([parameter][storage][code]){1}/.test(contract.michelson),
          "Contract michelson stored improperly, something is wrong!"
        );

        assert(
          contract.source.includes(`SmartPyContract${index + 1}`),
          "Contract source stored improperly, something is wrong!"
        );

        assert.equal(
          contract.compiler.name,
          "smartpy",
          "Compiler name set incorrectly!"
        );
      });

      done();
    });
  });

  it("skips solidity contracts", done => {
    compile.all(config, (err, contracts, paths) => {
      assert.equal(err, null, "Compiled with an error");

      paths.forEach(path => {
        assert.equal(
          path.indexOf(".sol"),
          -1,
          "Paths should not return .sol files"
        );
      });

      assert.equal(
        contracts.SolidityContract,
        undefined,
        "SolidityContract was compiled!!"
      );

      done();
    });
  });

  describe("when passed an entry point", () => {
    const configWithValidEntryPoint = new Config()
      .merge(defaultSettings)
      .merge({ _: ["SmartPyContract1"] });
    const configWithBadEntryPoint = new Config()
      .merge(defaultSettings)
      .merge({ _: ["bad"] });

    it("compiles successfully when passed a valid entry", done => {
      compile.all(configWithValidEntryPoint, (err, contracts) => {
        assert.equal(err, null, "Compiled with an error!");
        assert(contracts, "Contracts missing!");
        done();
      });
    });

    it("errors when passed an invalid entry", done => {
      compile.all(configWithBadEntryPoint, (err, contracts) => {
        assert(err, "Should not have compiled!");
        assert.equal(contracts, null, "Contracts should be missing!");
        done();
      });
    });
  });
});
