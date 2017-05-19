var fs = require("fs");
var spec = require("../spec/contract.spec.json");
var Ajv = require("ajv");
var assert = require("assert");
var Schema = require("../index.js");

var MetaCoin = require("./MetaCoin.json");

describe("Schema", function() {
  var validator;
  var invalidSchemaError;

  before("load schema library", function() {
    var ajv = new Ajv();
    try {
      validator = ajv.compile(spec);
    } catch (e) {
      invalidSchemaError = e;
    }
  });

  it("validates as json-schema", function() {
    assert.ifError(invalidSchemaError);
  });

  it("validates a simple example", function() {
    var valid = validator(MetaCoin);
    assert.ifError(validator.errors);
  });

  it("validates correct input", function() {
    Schema.validate(MetaCoin)
  });

  it("throws exception on invalid input", function() {
    var invalid = {
      "abi": -1
    };

    try {
      Schema.validate(invalid)
    } catch (errors) {
      var abiErrors = errors.filter(function(error) {
        return error.dataPath === ".abi"
      });
      assert(abiErrors);
    }
  });

});
