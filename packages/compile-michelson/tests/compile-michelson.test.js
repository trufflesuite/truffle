const path = require("path");
const assert = require("assert");
const Config = require("@truffle/config");
const compile = require("../index");

describe(`michelson "compiler"`, () => {
  const defaultSettings = {
    contracts_directory: path.join(__dirname, "./sources/"),
    quiet: true,
    all: true,
    _: []
  };
  const config = new Config().merge(defaultSettings);

  it(`"compiles" michelson contracts`, done => {
    compile.all(config, (err, contracts, paths) => {
      assert.equal(err, null, "Compiles with an error!");

      [contracts.MichelsonContract].forEach(contract => {
        paths.forEach(path => {
          assert(
            [".tz"].some(extension => path.indexOf(extension) !== -1),
            "Paths should only be .tz files"
          );
        });

        assert.notEqual(
          contract,
          undefined,
          `Compiled contract should not be undefined`
        );

        assert.equal(
          contract.contractName,
          `MichelsonContract`,
          "Contract name is set incorrectly"
        );

        assert.equal(
          contract.abi.length,
          0,
          "Direct michelson contracts do not currently have an ABI, something is amiss!"
        );

        assert(
          /([parameter][storage][code]){1}/.test(contract.michelson),
          "Contract michelson stored improperly, something is wrong!"
        );

        assert(
          /([parameter][storage][code]){1}/.test(contract.michelson),
          "Contract source stored improperly, something is wrong!"
        );

        assert.equal(
          contract.compiler.name,
          "@truffle/compile-michelson",
          "Compiler name set incorrectly!"
        );
      });
    });

    done();
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
