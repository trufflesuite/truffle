const fs = require("fs");
const path = require("path");
const Parser = require("../parser");
const CompilerSupplier = require("../compilerSupplier");
const assert = require("assert");

describe("Parser", function() {
  let source = null;
  let erroneousSource = null;
  let solc, supplierOptions;

  before("get code", async function() {
    source = fs.readFileSync(
      path.join(__dirname, "./sources/badSources/MyContract.sol"),
      "utf-8"
    );
    erroneousSource = fs.readFileSync(
      path.join(__dirname, "./sources/badSources/ShouldError.sol"),
      "utf-8"
    );
    supplierOptions = {
      solcConfig: {
        version: null
      },
      eventManager: {
        emit: () => {}
      }
    };
    const supplier = new CompilerSupplier(supplierOptions);
    solc = await supplier.load();
  });

  it("should return correct imports", function() {
    var imports = Parser.parseImports(source, solc);

    // Note that this test is important because certain parts of the solidity
    // output cuts off path prefixes like "./" and "../../../". If we get the
    // imports list incorrectly, we'll have collisions.
    var expected = [
      "./Dependency.sol",
      "./path/to/AnotherDep.sol",
      "../../../path/to/AnotherDep.sol",
      "ethpmpackage/Contract.sol"
    ];

    assert.deepEqual(imports, expected);
  });

  it("should throw an error when parsing imports if there's an actual parse error", function() {
    var error = null;
    try {
      Parser.parseImports(erroneousSource, solc);
    } catch (e) {
      error = e;
    }

    if (!error) {
      throw new Error("Expected a parse error but didn't get one!");
    }

    assert(
      error.message.indexOf("Expected pragma, import directive or contract") >=
        0
    );
  });
});
