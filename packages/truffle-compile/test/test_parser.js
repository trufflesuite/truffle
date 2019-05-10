const fs = require("fs");
const path = require("path");
const Parser = require("../parser");
const CompilerSupplier = require("../compilerSupplier");
const assert = require("assert");

describe("Parser", () => {
  let source = null;

  before("get code", async () => {
    source = fs.readFileSync(
      path.join(__dirname, "./sources/badSources/MyContract.sol"),
      "utf-8"
    );
    const supplier = new CompilerSupplier();
    let solc = await supplier.load();
  });

  it("should return correct imports", () => {
    const imports = Parser.parseImports(source);

    // Note that this test is important because certain parts of the solidity
    // output cuts off path prefixes like "./" and "../../../". If we get the
    // imports list incorrectly, we'll have collisions.
    const expected = [
      "./Dependency.sol",
      "./path/to/AnotherDep.sol",
      "../../../path/to/AnotherDep.sol",
      "ethpmpackage/Contract.sol"
    ];

    assert.deepEqual(imports, expected);
  });

  it("should return correct imports with native solc configured", () => {
    const config = { version: "native" };
    const nativeSupplier = new CompilerSupplier(config);
    nativeSupplier.load().then(() => {
      const imports = Parser.parseImports(source);

      // Note that this test is important because certain parts of the solidity
      // output cuts off path prefixes like "./" and "../../../". If we get the
      // imports list incorrectly, we'll have collisions.
      const expected = [
        "./Dependency.sol",
        "./path/to/AnotherDep.sol",
        "../../../path/to/AnotherDep.sol",
        "ethpmpackage/Contract.sol"
      ];

      assert.deepEqual(imports, expected);
    });
  });

  it("should return correct imports with docker solc configured", () => {
    const config = { docker: true, version: "0.4.25" };
    const dockerSupplier = new CompilerSupplier(config);
    dockerSupplier.load().then(() => {
      const imports = Parser.parseImports(source);

      // Note that this test is important because certain parts of the solidity
      // output cuts off path prefixes like "./" and "../../../". If we get the
      // imports list incorrectly, we'll have collisions.
      const expected = [
        "./Dependency.sol",
        "./path/to/AnotherDep.sol",
        "../../../path/to/AnotherDep.sol",
        "ethpmpackage/Contract.sol"
      ];

      assert.deepEqual(imports, expected);
    });
  });
});
