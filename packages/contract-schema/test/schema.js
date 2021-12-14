const Schema = require("../index.js");
const assert = require("assert");

const MetaCoin = require("./MetaCoin.json");

describe("Schema", function () {
  it("validates correct input", function () {
    Schema.validate(MetaCoin);
  });

  it("throws exception on invalid input", function () {
    const invalid = {
      abi: -1
    };

    try {
      Schema.validate(invalid);

      assert(false);
    } catch (err) {
      const abiErrors = err.errors.filter(function (error) {
        return error.dataPath === ".abi";
      });

      assert(abiErrors.length > 0);
    }
  });

  it("validates a correct input as part of normalization", function () {
    Schema.normalize(MetaCoin, {
      validate: true
    });
  });

  it("throws exception when attempting to validate invalid input during normalization", function () {
    const invalid = {
      abi: -1
    };

    try {
      Schema.normalize(invalid, {
        validate: true
      });

      assert(false);
    } catch (err) {
      const abiErrors = err.errors.filter(function (error) {
        return error.dataPath === ".abi";
      });

      assert(abiErrors.length > 0);
    }
  });
});
