var temp = require("temp").track();
var path = require("path");
var fs = require("fs");
var Config = require("../lib/config");
var Init = require("../lib/init");
var Create = require("../lib/create");

describe('truffle:create', function() {
  // Paths relative to app truffle directory.
  var truffle_dir = path.resolve("./");
  var temp_dir = temp.mkdirSync();

  before("initialize environment", function(done) {
    var config = Config.gather(truffle_dir, temp_dir, {}, null);
    Init.all(config, done);
  });

  it('successfully creates a new contract', function(done) {
    var argv = {
      name: "MyNewContract"
    };

    var config = Config.gather(truffle_dir, temp_dir, argv, "development");
    Create.contract(config, argv.name, function(err) {
      if (err != null) {
        return done(err);
      }

      var expected_file = path.join(temp_dir, "contracts", "MyNewContract.sol");
      assert.isTrue(fs.existsSync(expected_file), `Contract to be created doesns't exist, ${expected_file}`);

      var file_data = fs.readFileSync(expected_file, {encoding: "utf8"});
      assert.isNotNull(file_data, "File's data is null");
      assert.notEqual(file_data, "", "File's data is blank");

      done();
    });
  }); // it

  it('successfully creates a new test', function(done) {
    var argv = {
      name: "MyOtherNewContract"
    };

    var config = Config.gather(truffle_dir, temp_dir, argv, "development");
    Create.test(config, argv.name, function(err) {
      if (err != null) {
        return done(err);
      }

      var expected_file = path.join(temp_dir, "test", "my_other_new_contract.js");
      assert.isTrue(fs.existsSync(expected_file), `Test to be created doesns't exist, ${expected_file}`);

      var file_data = fs.readFileSync(expected_file, {encoding: "utf8"});
      assert.isNotNull(file_data, "File's data is null");
      assert.notEqual(file_data, "", "File's data is blank");

      done();
    });
  }); // it

});
