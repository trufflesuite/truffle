var SolidityUtils = require("../");
var path = require("path");
var assert = require("assert");

describe("Ordered ABI", function(done) {
  it("supports empty contracts (e.g., without any functions)", function(done) {
    var contract_file = path.join(__dirname, "MyContract.sol");

    SolidityUtils.ordered_abi(contract_file, [], "MyContract", function(err, ordered_abi) {
      if (err) return done(err);
      assert.equal(ordered_abi.length, 0);
      done();
    });
  });
});
