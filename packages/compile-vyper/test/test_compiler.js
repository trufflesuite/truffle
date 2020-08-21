const path = require("path");
const assert = require("assert");
const Config = require("@truffle/config");
const { Compile } = require("../index");

describe("vyper compiler", function () {
  this.timeout(20000);

  const defaultSettings = {
    contracts_directory: path.join(__dirname, "./sources/"),
    quiet: true,
    all: true
  };
  const config = new Config().merge(defaultSettings);

  it("compiles vyper contracts", async function () {
    const compilations = await Compile.all(config);
    const { contracts, sourceIndexes } = compilations[0];
    sourceIndexes.forEach(path => {
      assert(
        [".vy", ".v.py", ".vyper.py"].some(
          extension => path.indexOf(extension) !== -1
        ),
        "Paths have only vyper files"
      );
    });

    const hex_regex = /^[x0-9a-fA-F]+$/;

    contracts.forEach((contract, index) => {
      assert.notEqual(
        contract,
        undefined,
        `Compiled contracts have VyperContract${index + 1}`
      );
      assert.equal(
        contract.contractName,
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
  });

  it("skips solidity contracts", async function () {
    const compilations = await Compile.all(config);
    const { contracts, sourceIndexes } = compilations[0];

    sourceIndexes.forEach(path => {
      assert.equal(path.indexOf(".sol"), -1, "Paths have no .sol files");
    });
    const noSolidityContract = contracts.every(contract => {
      return contract.contractName !== "SolidityContract";
    });
    assert(noSolidityContract, "Compiled contracts have no SolidityContract");
  });

  describe("with external options set", function () {
    const configWithSourceMap = new Config().merge(defaultSettings).merge({
      compilers: {
        vyper: {
          settings: {
            sourceMap: true
          }
        }
      }
    });

    it("compiles when sourceMap option set true", async () => {
      const compilations = await Compile.all(configWithSourceMap);
      const { contracts } = compilations[0];
      contracts.forEach((contract, index) => {
        assert(
          contract.sourceMap,
          `source map have to not be empty. ${index + 1}`
        );
      });
    });
  });
});
