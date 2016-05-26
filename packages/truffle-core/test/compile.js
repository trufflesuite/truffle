var assert = require("chai").assert;
var Init = require("../lib/init");
var Contracts = require("../lib/contracts");
var Pudding = require("ether-pudding");
var path = require("path");
var fs = require("fs");

describe("compile", function() {
  var config;

  before("Create a sandbox", function(done) {
    this.timeout(5000);
    Init.sandbox(function(err, result) {
      if (err) return done(err);
      config = result;
      done();
    });
  });

  before("edit config", function() {
    config.networks = {
      "default": {
        "network_id": "default"
      },
      "secondary": {
        "network_id": "12345"
      }
    }
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

  it('compiles contract and dependencies after an update', function(done) {
    this.timeout(10000);

    var file_to_update = path.resolve(path.join(config.contracts_directory, "MetaCoin.sol"));

    // Update the modification time to simulate an edit.
    var newTime = new Date().getTime();
    fs.utimesSync(file_to_update, newTime, newTime);

    Contracts.compile(config.with({
      all: false,
      quiet: true
    }), function(err, contracts) {
      if (err) return done(err);

      assert.equal(Object.keys(contracts).length, 2, "Expected MetaCoin and ConvertLib to be compiled");
      done();
    });
  });

  it('contracts should only have one network', function(done) {
    var file = path.resolve(path.join(config.contracts_build_directory, "MetaCoin.sol.js"));

    Pudding.requireFile(file, function(err, contract) {
      if (err) return done(err);
      assert.equal(contract.networks().length, 1, "Expected the contract to only be managing one network");
      done();
    });
  });

  it('compiles all contracts after multiple changes after a change in network', function(done) {
    this.timeout(10000);

    config.network = "secondary";

    Contracts.compile(config.with({
      all: false,
      quiet: true
    }), function(err, contracts) {
      if (err) return done(err);

      assert.equal(Object.keys(contracts).length, 3, "Expected all contracts to be compiled on a second network");
      done();
    });
  });

  it('contracts should new have two networks', function(done) {
    var file = path.resolve(path.join(config.contracts_build_directory, "MetaCoin.sol.js"));

    Pudding.requireFile(file, function(err, contract) {
      if (err) return done(err);
      assert.equal(contract.networks().length, 2, "Expected the contract to be managing two networks");
      done();
    });
  });
});
