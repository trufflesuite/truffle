var assert = require("chai").assert;
var temp = require("temp").track();
var contract = require("../");
var path = require('path');
var requireNoCache = require("require-nocache")(module);

describe("Custom options", function() {

  it("allows custom options", function() {
    Example = contract({
      contractName: "Example",
      abi: [],
      binary: "0xabcdef",
      address: "0xe6e1652a0397e078f434d6dda181b218cfd42e01",
      network_id: 3,
      "x-from-dependency": "somedep"
    })
    assert.equal(Example["x-from-dependency"], "somedep");
  });

});
