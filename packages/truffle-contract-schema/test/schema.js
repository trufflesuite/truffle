var Schema = require("../index.js");
var assert = require("assert");

var MetaCoin = require("./MetaCoin.json");

describe("Schema", function() {
  it("validates correct input", function() {
    Schema.validate(MetaCoin);
  });

  it("throws exception on invalid input", function() {
    var invalid = {
      "abi": -1
    };

    try {
      Schema.validate(invalid);
    } catch (err) {
      var abiErrors = err.errors.filter(function(error) {
        return error.dataPath === ".abi";
      });
      assert(abiErrors);
    }
  });

});
