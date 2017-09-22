var fs = require("fs");
var path = require("path");
var Parser = require("../parser");
var assert = require("assert");

describe("Parser", function() {
  var source = null;

  before("get code", function() {
    source = fs.readFileSync(path.join(__dirname, "MyContract.sol"), "utf-8");
  });

  it("should return correct imports", function() {
    var imports = Parser.parseImports(source);

    // Note that this test is important because certain parts of the solidity
    // output cuts off path prefixes like "./" and "../../../". If we get the
    // imports list incorrectly, we'll have collisions. 
    var expected = [ 
      './Dependency.sol',
      './path/to/AnotherDep.sol',
      '../../../path/to/AnotherDep.sol',
      'ethpmpackage/Contract.sol' 
    ];

    assert.deepEqual(imports, expected)
  });

  it("should return a full AST when parsed, even when dependencies don't exist", function() {
    this.timeout(4000);

    var output = Parser.parse(source);

    assert.deepEqual(output.contracts, ["MyContract", "SomeInterface", "SomeLibrary"]);
    assert(output.ast.nodes.length > 0); 
    
    // The above assert means we at least got some kind of AST.
    // Is there something we specifically need here? 
  });
});