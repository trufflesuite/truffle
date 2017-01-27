var Schema = require("../index.js");
var assert = require("assert");

describe("options", function() {
  it("let's x- options through", function() {
    var options = {
      "x-from-dependency": "adder/Adder.sol"
    }

    options = Schema.normalizeOptions(options);
    assert.equal(options["x-from-dependency"], "adder/Adder.sol");

    options = Schema.generateBinary(options);
    assert.equal(options["x-from-dependency"], "adder/Adder.sol");

    options = Schema.generateBinary(options, {"x-another-option": "exists"});
    assert.equal(options["x-another-option"], "exists");
  });
});
