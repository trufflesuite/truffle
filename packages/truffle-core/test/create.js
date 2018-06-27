var assert = require("chai").assert;
var path = require("path");
var fs = require("fs");
var Box = require("truffle-box");
var Create = require("../lib/create");
var dir = require("node-dir");
var Resolver = require("truffle-resolver");
var Artifactor = require("truffle-artifactor");

describe('create', function() {
  var config;

  before("Create a sandbox", function(done) {
    this.timeout(10000);
    Box.sandbox(function(err, result) {
      if (err) return done(err);
      config = result;
      config.resolver = new Resolver(config);
      config.artifactor = new Artifactor(config.contracts_build_directory);
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
  });

  it('will not overwrite an existing contract (by default)', function(done){
    Create.contract(config.contracts_directory, "MyNewContract2", function(err) {
      if (err) return done(err);

      var expected_file = path.join(config.contracts_directory, "MyNewContract2.sol");
      assert.isTrue(fs.existsSync(expected_file), `Contract to be created doesns't exist, ${expected_file}`);

      Create.contract(config.contracts_directory, "MyNewContract2", function(err) {
        assert(err.message.includes('file exists'));
        done();
      });
    });
  });

  it('will overwrite an existing contract if the force option is enabled', function(done){
    Create.contract(config.contracts_directory, "MyNewContract3", function(err) {
      if (err) return done(err);

      var expected_file = path.join(config.contracts_directory, "MyNewContract3.sol");
      assert.isTrue(fs.existsSync(expected_file), `Contract to be created doesns't exist, ${expected_file}`);

      var options = {force: true};
      Create.contract(config.contracts_directory, "MyNewContract3", options, function(err) {
        assert(err === null);
        done();
      });
    });
  });

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
        if (err) return done(err);

        var found = false;
        var expected_suffix = "_my_new_migration.js";

        for (var i = 0; i < files.length; i++) {
          var file = files[i];

          if (file.indexOf(expected_suffix) == file.length - expected_suffix.length) {
            var file_data = fs.readFileSync(file, {encoding: "utf8"});
            assert.isNotNull(file_data, "File's data is null");
            assert.notEqual(file_data, "", "File's data is blank");

            return done();
          }
        }

        if (found == false) {
          assert.fail("Could not find a file that matched expected name");
        }
      });
    });
  }); // it

});
