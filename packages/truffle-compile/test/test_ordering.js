var fs = require("fs");
var path = require("path");
var solc = require("solc");
var Compile = require("../index");
var assert = require("assert");

describe("Compile", function() {
  this.timeout(5000); // solc
  var simpleOrderedSource = null;
  var complexOrderedSource = null;
  var inheritedSource = null;
  var compileOptions = { contracts_directory: '', solc: ''};

  describe("ABI Ordering", function(){
    before("get code", function() {
      simpleOrderedSource = fs.readFileSync(path.join(__dirname, "./sources/SimpleOrdered.sol"), "utf-8");
      complexOrderedSource = fs.readFileSync(path.join(__dirname, "./sources/ComplexOrdered.sol"), "utf-8");
      inheritedSource = fs.readFileSync(path.join(__dirname, "./sources/InheritB.sol"), "utf-8");
    });

    // Ordered.sol's methods are ordered semantically.
    // solc alphabetizes methods within a file (but interpolates imported methods).
    it("Simple ABI should be out of source order when solc compiles it", function(){
      var alphabetic = ['andThird', 'second', 'theFirst'];
      var input = {
        language: "Solidity",
        sources: { "SimpleOrdered.sol": { content: simpleOrderedSource }},
        settings: { outputSelection: { "*": { "*": ["abi"] } } }
      };

      var result = solc.compileStandard(JSON.stringify(input));
      result = JSON.parse(result);
      var abi = result.contracts["SimpleOrdered.sol"]["SimpleOrdered"].abi.map(function(item){
        return item.name;
      });
      assert.deepEqual(abi, alphabetic);
    });

    it("orders the simple ABI", function(done){
      var expectedOrder = ['theFirst', 'second', 'andThird'];
      var sources = {};
      sources["SimpleOrdered.sol"] = simpleOrderedSource;

      Compile(sources, compileOptions, function(err, result){
        var abi = result["SimpleOrdered"].abi.map(function(item){
          return item.name;
        });
        assert.deepEqual(abi, expectedOrder);
        done();
      })
    });

    // Ordered.sol's methods are ordered semantically.
    // solc alphabetizes methods within a file (but interpolates imported methods).
    it("Complex ABI should be out of source order when solc compiles it", function(){
      var alphabetic = ['andThird', 'second', 'theFirst', 'LogB', 'LogA', 'LogD', 'LogC'];
      var input = {
        language: "Solidity",
        sources: { "ComplexOrdered.sol": { content: complexOrderedSource },
                   "InheritB.sol": { content: inheritedSource },},
        settings: { outputSelection: { "*": { "*": ["abi"] } } }
      };

      var result = solc.compileStandard(JSON.stringify(input));
      result = JSON.parse(result);
      var abi = result.contracts["ComplexOrdered.sol"]["ComplexOrdered"].abi.map(function(item){
        return item.name;
      });
      assert.deepEqual(abi, alphabetic);
    });

    it("orders the complex ABI", function(done){
      var expectedOrder = ['LogB', 'LogA', 'LogD', 'LogC', 'theFirst', 'second', 'andThird'];
      var sources = {};
      sources["ComplexOrdered.sol"] = complexOrderedSource;
      sources["InheritB.sol"] = inheritedSource;

      Compile(sources, compileOptions, function(err, result){
        var abi = result["ComplexOrdered"].abi.map(function(item){
          return item.name;
        });
        assert.deepEqual(abi, expectedOrder);
        done();
      })
    });

    // Ported from `truffle-solidity-utils`
    it("orders the ABI of a contract without functions", function(done){
      var sources = {};
      // ComplexOrdered.sol includes contract `Empty`
      sources["ComplexOrdered.sol"] = complexOrderedSource;
      sources["InheritB.sol"] = inheritedSource;

      Compile(sources, compileOptions, function(err, result){
        assert.equal(result["Empty"].abi.length, 0);
        done();
      })
    })
  })
});

