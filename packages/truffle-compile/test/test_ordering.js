var fs = require("fs");
var path = require("path");
var solc = require("solc");
var Compile = require("../index");
var assert = require("assert");

describe("Compile", function() {
  this.timeout(5000); // solc
  var orderedSource = null;
  var emptySource = null;
  var compileOptions = { contracts_directory: '', solc: ''};

  describe("ABI Ordering", function(){
    before("get code", function() {
      orderedSource = fs.readFileSync(path.join(__dirname, "Ordered.sol"), "utf-8");
      inheritedSource = fs.readFileSync(path.join(__dirname, "InheritB.sol"), "utf-8");
    });

    // Ordered.sol's methods are ordered semantically.
    // solc alphabetizes methods within a file (but interpolates imported methods).
    it("ABI should be out of source order when solc compiles it", function(){
      var alphabetic = ['andThird', 'second', 'theFirst', 'LogB', 'LogA', 'LogD', 'LogC'];
      var input = {
        language: "Solidity",
        sources: { "Ordered.sol": { content: orderedSource },
                   "InheritB.sol": { content: inheritedSource },},
        settings: { outputSelection: { "*": { "*": ["abi"] } } }
      };

      var result = solc.compileStandard(JSON.stringify(input));
      result = JSON.parse(result);
      var abi = result.contracts["Ordered.sol"]["Ordered"].abi.map(function(item){
        return item.name;
      });
      assert.deepEqual(abi, alphabetic);
    });

    it("orders the ABI", function(){
      var expectedOrder = ['theFirst', 'second', 'andThird', 'LogB', 'LogA', 'LogD', 'LogC'];
      var sources = {};
      sources["Ordered.sol"] = orderedSource;
      sources["InheritB.sol"] = inheritedSource;

      Compile(sources, compileOptions, function(err, result){
        var abi = result["Ordered"].abi.map(function(item){
          return item.name;
        });
        assert.deepEqual(abi, expectedOrder);
      })
    });

    // Ported from `truffle-solidity-utils`
    it("orders the ABI of a contract without functions", function(){
      var sources = {};
      sources["Ordered.sol"] = orderedSource;
      sources["InheritB.sol"] = inheritedSource;

      Compile(sources, compileOptions, function(err, result){
        assert.equal(result["Empty"].abi.length, 0);
      })
    })
  })
});

