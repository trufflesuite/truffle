const fs = require("fs");
const path = require("path");
const Parser = require("../dist/parser");
const { createCompilerSupplier } = require("../dist/compilerSupplier");
const assert = require("assert");

describe("Parser", () => {
  let source = null;
  let solc;

  const expected = [
    "./Dependency.sol",
    "./path/to/AnotherDep.sol",
    "../../../path/to/AnotherDep.sol",
    "ethpmpackage/Contract.sol",
    "./somePath.sol",
    "./someImportWithNoSpace.sol",
    "../../someRelativeMultilineImport.sol",
    "someAbsoluteMultilineImport.sol"
  ];

  before("get code", async () => {
    source = fs.readFileSync(
      path.join(__dirname, "./sources/v0.4.15/MyContract.sol"),
      "utf-8"
    );

    supplierOptions = {
      solcConfig: { },
      events: { emit: () => {} }
    };
    const supplier = createCompilerSupplier(supplierOptions);
    ({ solc } = await supplier.load());
  });

  it("should return correct imports with solcjs", () => {
    const imports = Parser.parseImports(source, solc);

    // Note that this test is important because certain parts of the solidity
    // output cuts off path prefixes like "./" and "../../../". If we get the
    // imports list incorrectly, we'll have collisions.

    assert.deepEqual(imports, expected);
  });

  it("should return correct imports with native solc [ @native ]", () => {
    const options = {
      events: { emit: () => {} },
      solcConfig: { version: "native" }
    };
    const nativeSupplier = createCompilerSupplier(options);

    nativeSupplier.load().then(({ solc }) => {
      const imports = Parser.parseImports(source, solc);
      // Note that this test is important because certain parts of the solidity
      // output cuts off path prefixes like "./" and "../../../". If we get the
      // imports list incorrectly, we'll have collisions.

      assert.deepEqual(imports, expected);
    });
  });

  it("should return correct imports with docker solc [ @native ]", () => {
    const options = {
      events: { emit: () => {} },
      solcConfig: {
        docker: true,
        version: "0.4.25"
      }
    };
    const dockerSupplier = createCompilerSupplier(options);

    dockerSupplier.load().then(({ solc }) => {
      const imports = Parser.parseImports(source, solc);
      // Note that this test is important because certain parts of the solidity
      // output cuts off path prefixes like "./" and "../../../". If we get the
      // imports list incorrectly, we'll have collisions.

      assert.deepEqual(imports, expected);
    });
  }).timeout(20000);
});
