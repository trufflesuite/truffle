var assert = require("chai").assert;
var Box = require("truffle-box");
var Contracts = require("truffle-workflow-compile");
var Artifactor = require("truffle-artifactor");
var Resolver = require("truffle-resolver");
var path = require("path");
var fs = require("fs");

describe("compile", function() {
  var config;

  before("Create a sandbox", function(done) {
    this.timeout(10000);
    Box.sandbox(function(err, result) {
      if (err) return done(err);
      config = result;
      config.resolver = new Resolver(config);
      config.artifactor = new Artifactor(config.contracts_build_directory);
      config.networks = {
        "default": {
          "network_id": "1"
        },
        "secondary": {
          "network_id": "12345"
        }
      };
      config.network = "default";
      done();
    });
  });

  it('compiles all initial contracts', function(done) {
    this.timeout(10000);

    Contracts.compile(config.with({
      all: false,
      quiet: true
    }), function(err, contracts) {
      if (err) return done(err);

      assert.equal(Object.keys(contracts).length, 3, "Didn't compile the expected number of contracts");
      done();
    });
  });

  it('compiles no contracts after no updates', function(done) {
    this.timeout(10000);

    Contracts.compile(config.with({
      all: false,
      quiet: true
    }), function(err, contracts) {
      if (err) return done(err);

      assert.equal(Object.keys(contracts).length, 0, "Compiled a contract even though we weren't expecting it");
      done();
    });
  });

  it('compiles updated contract and descendents', function(done) {
    this.timeout(10000);

    var file_to_update = path.resolve(path.join(config.contracts_directory, "MetaCoin.sol"));
    var stat = fs.statSync(file_to_update);

    // Update the modification time to simulate an edit.
    var newTime = new Date().getTime();
    fs.utimesSync(file_to_update, newTime, newTime);

    Contracts.compile(config.with({
      all: false,
      quiet: true
    }), function(err, contracts) {
      if (err) return done(err);

      assert.equal(Object.keys(contracts).length, 2, "Expected MetaCoin and ConvertLib to be compiled");

      // reset time
      fs.utimesSync(file_to_update, stat.atime, stat.mtime);

      done();
    });
  });

  it('compiles updated contract and its ancestors', function(done) {
    this.timeout(10000);

    var file_to_update = path.resolve(path.join(config.contracts_directory, "ConvertLib.sol"));
    var stat = fs.statSync(file_to_update);

    // Update the modification time to simulate an edit.
    var newTime = new Date().getTime();
    fs.utimesSync(file_to_update, newTime, newTime);

    Contracts.compile(config.with({
      all: false,
      quiet: true
    }), function(err, contracts) {
      if (err) return done(err);

      assert.equal(Object.keys(contracts).length, 2, "Expected MetaCoin and ConvertLib to be compiled");

      // reset time
      fs.utimesSync(file_to_update, stat.atime, stat.mtime);

      done();
    });
  });

  it("compiling shouldn't create any network artifacts", function() {
    var contract = config.resolver.require("MetaCoin.sol");
    assert.equal(Object.keys(contract.networks).length, 0, "Expected the contract to be managing zero networks");
  });

  // TODO: Kept this as a comment because I'm confused if it applies.
  // Since the binary and abi are updated with every compile, and they're not within
  // the networks object anymore, it may not matter when that specific network changed.

  // it('compiles all contracts after multiple changes after a change in network', function(done) {
  //   this.timeout(10000);
  //
  //   config.network = "secondary";
  //
  //   Contracts.compile(config.with({
  //     all: false,
  //     quiet: true
  //   }), function(err, contracts) {
  //     if (err) return done(err);
  //
  //     assert.equal(Object.keys(contracts).length, 3, "Expected all contracts to be compiled on a second network");
  //     done();
  //   });
  // });
  //
  // it('contracts should now have two networks', function() {
  //   var contract = config.resolver.require("MetaCoin.sol");
  //   assert.equal(contract.networks().length, 2, "Expected the contract to be managing two networks");
  // });
});
