var temp = require("temp").track();
var path = require("path");
var fs = require("fs");
var Config = require("../lib/config");
var Init = require("../lib/init")

describe('truffle:init', function() {
  // Paths relative to app truffle directory.
  var truffle_dir = path.resolve("./");

  it('successfully copies example configuration', function(done) {

    var temp_dir = temp.mkdirSync();
    var config = Config.gather(truffle_dir, temp_dir, {}, null);

    Init.all(config, function(err) {
      if (err != null) {
        return done(err);
      }

      assert.isTrue(fs.existsSync(path.join(temp_dir, "app")), "app directory not created successfully");
      assert.isTrue(fs.existsSync(path.join(temp_dir, "config")), "config directory not created successfully");
      assert.isTrue(fs.existsSync(path.join(temp_dir, "contracts")), "contracts directory not created successfully");
      assert.isTrue(fs.existsSync(path.join(temp_dir, "test")), "tests directory not created successfully");

      done();
    });
  });
});
