var assert = require("chai").assert;
var path = require("path");
var fs = require("fs");
var Config = require("../lib/config");
var Create = require("../lib/create");

describe('create', function() {
  var config;

  before("Create a sandbox", function(done) {
    this.timeout(5000);
    Config.sandbox(function(err, result) {
      if (err) return done(err);
      config = result;
      done();
    });
  });

  it('creates a new contract', function(done) {
    Create.contract(config.contracts_directory, "MyNewContract", function(err) {
      if (err) return done(err);

      var expected_file = path.join(config.contracts_directory, "MyNewContract.sol");
      assert.isTrue(fs.existsSync(expected_file), `Contract to be created doesns't exist, ${expected_file}`);

      var file_data = fs.readFileSync(expected_file, {encoding: "utf8"});
      assert.isNotNull(file_data, "File's data is null");
      assert.notEqual(file_data, "", "File's data is blank");

      done();
    });
  }); // it

  it('creates a new test', function(done) {
    Create.test(config.test_directory, "MyNewTest", function(err) {
      if (err) return done(err);

      var expected_file = path.join(config.test_directory, "my_new_test.js");
      assert.isTrue(fs.existsSync(expected_file), `Test to be created doesns't exist, ${expected_file}`);

      var file_data = fs.readFileSync(expected_file, {encoding: "utf8"});
      assert.isNotNull(file_data, "File's data is null");
      assert.notEqual(file_data, "", "File's data is blank");

      done();
    });
  }); // it

});
