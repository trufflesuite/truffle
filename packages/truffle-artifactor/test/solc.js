var assert = require("chai").assert;
var temp = require("temp").track();
var solc = require("solc");
var path = require("path");
var Artifactor = require("../");
var contract = require("truffle-contract");

describe("solc", function() {
  it("Will save files using input directly from solc", function(done) {
    this.timeout(5000);
    var result = solc.compile("contract A { function doStuff() {} } \n\n contract B { function somethingElse() {} }", 1);

    var dirPath = temp.mkdirSync({
      dir: path.resolve("./"),
      prefix: 'tmp-artifactor-solc-'
    });

    var artifactor = new Artifactor(dirPath);

    // Add the network id since it's required
    Object.keys(result.contracts).forEach(function(key) {
      result.contracts[key].network_id = "1337";
    });

    artifactor.saveAll(result.contracts, dirPath).then(function() {
      var A = contract(require(path.join(dirPath, "A.json")));
      var B = contract(require(path.join(dirPath, "B.json")));

      A.setNetwork("1337");
      B.setNetwork("1337");

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
