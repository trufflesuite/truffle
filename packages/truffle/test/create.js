var assert = require("chai").assert;
var path = require("path");
var fs = require("fs");
var Init = require("../lib/init");
var Create = require("../lib/create");
var dir = require("node-dir");

describe('create', function() {
  var config;

  before("Create a sandbox", function(done) {
    this.timeout(5000);
    Init.sandbox(function(err, result) {
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

  it('creates a new migration', function(done) {
    Create.migration(config.migrations_directory, "MyNewMigration", function(err) {
      if (err) return done(err);

      dir.files(config.migrations_directory, function(err, files) {
        var found = false;
        files.forEach(function(file) {
          if (file.indexOf("my_new_migration") > 0) {
            var file_data = fs.readFileSync(file, {encoding: "utf8"});
            assert.isNotNull(file_data, "File's data is null");
            assert.notEqual(file_data, "", "File's data is blank");

            found = true;

            done();
          }
        });

        if (found == false) {
          assert.fail("Could not find a file that matched expected name");
        }
      });
    });
  }); // it

});
