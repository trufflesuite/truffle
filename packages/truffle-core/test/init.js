var assert = require("chai").assert;
var Init = require("../lib/init");
var fs = require("fs");
var path = require('path');

describe('init', function() {
  var config;

  before("Create a sandbox", function(done) {
    this.timeout(5000);
    Init.sandbox(function(err, result) {
      if (err) return done(err);
      config = result;
      done();
    });
  });

  it('copies example configuration', function(done) {
    assert.isTrue(fs.existsSync(path.join(config.working_directory, "app")), "app directory not created successfully");
    assert.isTrue(fs.existsSync(path.join(config.working_directory, "contracts")), "contracts directory not created successfully");
    assert.isTrue(fs.existsSync(path.join(config.working_directory, "test")), "tests directory not created successfully");

    done();
  });
});
