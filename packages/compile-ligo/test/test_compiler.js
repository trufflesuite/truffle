const path = require("path");
const assert = require("assert");
const Config = require("@truffle/config");
const compile = require("../index");

describe("ligo compiler", () => {
  const defaultSettings = {
    contracts_directory: path.join(__dirname, "./sources/"),
    quiet: true,
    all: true
  };
  const config = new Config().merge(defaultSettings);

  it("compiles ligo contracts", done => {
    compile.all(config, (err, contracts, paths) => {
      assert.equal(err, null, "Compiles without error");

      paths.forEach(path => {
        assert(
          [".ligo", ".mligo"].some(extension => path.indexOf(extension) !== -1),
          "Paths should only be ligo files"
        );
      });

      [contracts.LigoContract1, contracts.LigoContract2].forEach(
        (contract, index) => {
          assert.notEqual(
            contract,
            undefined,
            `Compiled contract should be LigoContract${index + 1}`
          );

          assert.equal(
            contract.contractName,
            `LigoContract${index + 1}`,
            "Contract name is set incorrectly"
          );

          assert.equal(
            contract.abi.length,
            0,
            "LIGO compiler doesn't currently output contract ABI, something is amiss!"
          );

          assert(
            /([parameter][storage][code]){1}/.test(contract.code),
            "Contract code stored improperly, something is wrong!"
          );

          assert(
            contract.source.includes("main"),
            "Contract source stored improperly, something is wrong!"
          );

          assert.equal(
            contract.compiler.name,
            "ligo",
            "Compiler name set incorrectly!"
          );
        }
      );

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
});
