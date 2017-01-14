var assert = require("chai").assert;
var Init = require("../lib/init");
var Profiler = require("truffle-compile/profiler.js");
var Resolver = require("truffle-resolver");

// TOOD: Move this to truffle-compile!

describe('profiler', function() {
  var config;

  before("Create a sandbox", function(done) {
    this.timeout(5000);
    Init.sandbox(function(err, result) {
      if (err) return done(err);
      config = result;
      config.addResolvers(Resolver.defaults());
      done();
    });
  });

  it('profiles example project successfully', function(done) {
    Profiler.required_sources(config.with({
      paths: ["./MetaCoin.sol"],
      base_path: config.contracts_directory
    }), function(err, result) {
      if (err) return done(err);

      assert.equal(Object.keys(result).length, 2);
      done();
    });
  });
});
