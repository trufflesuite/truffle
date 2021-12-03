var Schema = require("../index.js");
var assert = require("assert");

var MetaCoin = require("./MetaCoin.json");

describe("Schema", function () {
  it("validates correct input", function () {
    Schema.validate(MetaCoin);
  });

  it("throws exception on invalid input", function () {
    var invalid = {
      abi: -1
    };

    try {
      Schema.validate(invalid);
    } catch (err) {
      var abiErrors = err.errors.filter(function (error) {
        return error.dataPath === ".abi";
      });
      assert(abiErrors);
    }
  });

  it("validates a correct input as part of normalization", function () {
    Schema.normalize(MetaCoin, {
      validate: true
    });
  });

  it("throws exception when attempting to validate invalid input during normalization", function () {
    var invalid = {
      abi: -1
    };

    try {
      Schema.normalize(invalid, {
        validate: true
      });
    } catch (err) {
      var abiErrors = err.errors.filter(function (error) {
        return error.dataPath === ".abi";
      });
      assert(abiErrors);
    }
  });
});
