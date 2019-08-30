var assert = require("chai").assert;
var contract = require("../");

describe("Custom options", function() {
  it("allows custom options", function() {
    var Example = contract({
      "contractName": "Example",
      "abi": [],
      "binary": "0xabcdef",
      "address": "0xe6e1652a0397e078f434d6dda181b218cfd42e01",
      "network_id": 3,
      "x-from-dependency": "somedep"
    });
    assert.equal(Example["x-from-dependency"], "somedep");
  });
});
