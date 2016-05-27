var assert = require("chai").assert;
var Init = require("../lib/init");
var Migrate = require("../lib/migrate");
var Contracts = require("../lib/contracts");
var Profiler = require("../lib/profiler");
var Pudding = require("ether-pudding");
var path = require("path");
var fs = require("fs");

describe("migrate", function() {
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

  it('profiles a new project as not having any contracts deployed', function(done) {
    Profiler.deployed_networks(config, function(err, networks) {
      if (err) return done(err);

      assert.equal(Object.keys(networks).length, 2, "Should have results for two networks from profiler");
      assert.equal(Object.keys(networks["default"]), 0, "Default network should not have been deployed to");
      assert.equal(Object.keys(networks["secondary"]), 0, "Secondary network should not have been deployed to");
      done();
    })
  });

  it('links libraries in initial project, and runs all migrations', function(done) {
    this.timeout(10000);

    Contracts.compile(config.with({
      all: false,
      quiet: true
    }), function(err) {
      if (err) return done(err);

      Migrate.run(config.with({
        quiet: true
      }), function(err, contracts) {
        if (err) return done(err);

        Profiler.deployed_networks(config, function(err, networks) {
          if (err) return done(err);

          assert.equal(Object.keys(networks).length, 2, "Should have results for two networks from profiler");
          assert.equal(Object.keys(networks["default"]).length, 3, "Default network should have three contracts deployed");
          assert.isNotNull(networks["default"]["MetaCoin"], "MetaCoin contract should have an address");
          assert.isNotNull(networks["default"]["ConvertLib"], "ConvertLib library should have an address");
          assert.isNotNull(networks["default"]["Migrations"], "Migrations contract should have an address");
          assert.equal(Object.keys(networks["secondary"]), 0, "Secondary network should not have been deployed to");
          done();
        });
      });
    });
  });

  it('should migrate secondary network without altering primary network', function(done) {
    this.timeout(10000);

    config.network = "secondary";

    var currentAddresses = {};

    Profiler.deployed_networks(config, function(err, networks) {
      if (err) return done(err);

      ["MetaCoin", "ConvertLib", "Migrations"].forEach(function(contract_name) {
        currentAddresses[contract_name] = networks["default"][contract_name];
      });

      Contracts.compile(config.with({
        quiet: true
      }), function(err) {
        if (err) return done(err);

        Migrate.run(config.with({
          quiet: true
        }), function(err, contracts) {
          if (err) return done(err);

          Profiler.deployed_networks(config, function(err, networks) {
            if (err) return done(err);

            assert.equal(Object.keys(networks).length, 2, "Should have results for two networks from profiler");
            assert.equal(Object.keys(networks["default"]).length, 3, "Default network should have three contracts deployed");
            assert.equal(networks["default"]["MetaCoin"], currentAddresses["MetaCoin"], "MetaCoin contract updated on default network");
            assert.equal(networks["default"]["ConvertLib"], currentAddresses["ConvertLib"], "ConvertLib library updated on default network");
            assert.equal(networks["default"]["Migrations"], currentAddresses["Migrations"], "Migrations contract updated on default network");
            assert.equal(Object.keys(networks["secondary"]).length, 3, "Secondary network should have three contracts deployed");
            assert.isNotNull(networks["secondary"]["MetaCoin"], "MetaCoin contract should have an address on secondary network");
            assert.isNotNull(networks["secondary"]["ConvertLib"], "ConvertLib library should have an address on secondary network");
            assert.isNotNull(networks["secondary"]["Migrations"], "Migrations contract should have an address on secondary network");

            Object.keys(networks["default"]).forEach(function(contract_name) {
              assert.notEqual(networks["secondary"][contract_name], networks["default"][contract_name], "Contract " + contract_name + " has the same address on both networks")
            });

            done();
          });
        });
      });

    });
  });
});
