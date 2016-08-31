var assert = require("chai").assert;
var temp = require("temp").track();
var solc = require("solc");
var path = require("path");
var Pudding = require("../");

describe("Pudding", function() {
  it("Will save files using input directly from solc", function(done) {
    var result = solc.compile("contract A { function doStuff() {} } \n\n contract B { function somethingElse() {} }", 1);

    var dirPath = temp.mkdirSync({
      dir: path.resolve("./"),
      prefix: 'tmp-pudding-solc-'
    });

    Pudding.saveAll(result.contracts, dirPath).then(function() {
      var A = require(path.join(dirPath, "A.sol.js"));
      var B = require(path.join(dirPath, "B.sol.js"));

      var wash = function(interface) {
        return JSON.stringify(JSON.parse(interface));
      };

      assert.equal(JSON.stringify(A.abi), wash(result.contracts["A"].interface));
      assert.equal(JSON.stringify(B.abi), wash(result.contracts["B"].interface));
      assert.equal(A.binary, "0x" + result.contracts["A"].bytecode);
      assert.equal(B.binary, "0x" + result.contracts["B"].bytecode);
    }).then(done).catch(done);
  });

  after(function(done) {
    temp.cleanupSync();
    done();
  });

});
