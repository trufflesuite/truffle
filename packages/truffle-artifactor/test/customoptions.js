var assert = require("chai").assert;
var Artifactor = require("../");
var temp = require("temp").track();
var contract = require("truffle-contract");
var path = require('path');
var requireNoCache = require("require-nocache")(module);

describe("Custom options", function() {

  it("allows custom options", function(done) {
    // Setup
    var dirPath = temp.mkdirSync({
      dir: path.resolve("./"),
      prefix: 'tmp-test-contract-'
    });

    var expected_filepath = path.join(dirPath, "Example.json");

    artifactor = new Artifactor(dirPath);

    artifactor.save({
      contract_name: "Example",
      abi: [],
      binary: "0xabcdef",
      address: "0xe6e1652a0397e078f434d6dda181b218cfd42e01",
      network_id: 3,
      "x-from-dependency": "somedep"
    }).then(function() {
      var json = requireNoCache(expected_filepath);
      Example = contract(json);

      assert.equal(Example["x-from-dependency"], "somedep");
    }).then(done).catch(done);
  });

});
