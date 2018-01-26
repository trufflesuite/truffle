var assert = require("chai").assert;
var Box = require("truffle-box");
var Migrate = require("truffle-migrate");
var Contracts = require("truffle-workflow-compile");
var Networks = require("../lib/networks");
var path = require("path");
var fs = require("fs");
var TestRPC = require("ganache-cli");
var Resolver = require("truffle-resolver");
var Artifactor = require("truffle-artifactor");
var Web3 = require("web3");

describe("migrate", function() {
  var config;
  var accounts;
  var network_id_one;
  var network_id_two;
  var from_addresses = [];

  before("Create a sandbox", function(done) {
    this.timeout(10000);
    Box.sandbox(function(err, result) {
      if (err) return done(err);
      config = result;
      config.resolver = new Resolver(config);
      config.artifactor = new Artifactor(config.contracts_build_directory);
      config.networks = {};
      done();
    });
  });

  function createProviderAndSetNetworkConfig(network, callback) {
    var provider = TestRPC.provider({seed: network, gasLimit: config.gas});
    var web3 = new Web3(provider);
    web3.eth.getAccounts(function(err, accs) {
      if (err) return callback(err);

      web3.version.getNetwork(function(err, network_id) {
        if (err) return callback(err);

        config.networks[network] = {
          provider: provider,
          network_id: network_id + "",
          from: accs[0]
        };

        callback();
      });
    });
  };

  before("Get accounts and network id of network one", function(done) {
    createProviderAndSetNetworkConfig("primary", done);
  });

  before("Get accounts and network id of network one", function(done) {
    createProviderAndSetNetworkConfig("secondary", done);
  });

  it('profiles a new project as not having any contracts deployed', function(done) {
    Networks.deployed(config, function(err, networks) {
      if (err) return done(err);

      assert.equal(Object.keys(networks).length, 2, "Should have results for two networks from profiler");
      assert.equal(Object.keys(networks["primary"]), 0, "Primary network should not have been deployed to");
      assert.equal(Object.keys(networks["secondary"]), 0, "Secondary network should not have been deployed to");
      done();
    })
  });

  it('links libraries in initial project, and runs all migrations', function(done) {
    this.timeout(10000);

    config.network = "primary";

    Contracts.compile(config.with({
      all: false,
      quiet: true
    }), function(err, contracts) {
      if (err) return done(err);

      Migrate.run(config.with({
        quiet: true
      }), function(err) {
        if (err) return done(err);

        Networks.deployed(config, function(err, networks) {
          if (err) return done(err);

          assert.equal(Object.keys(networks).length, 2, "Should have results for two networks from profiler");
          assert.equal(Object.keys(networks["primary"]).length, 3, "Primary network should have three contracts deployed");
          assert.isNotNull(networks["primary"]["MetaCoin"], "MetaCoin contract should have an address");
          assert.isNotNull(networks["primary"]["ConvertLib"], "ConvertLib library should have an address");
          assert.isNotNull(networks["primary"]["Migrations"], "Migrations contract should have an address");
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

    Networks.deployed(config, function(err, networks) {
      if (err) return done(err);

      ["MetaCoin", "ConvertLib", "Migrations"].forEach(function(contract_name) {
        currentAddresses[contract_name] = networks["primary"][contract_name];
      });

      Migrate.run(config.with({
        quiet: true
      }), function(err, contracts) {
        if (err) return done(err);

        Networks.deployed(config, function(err, networks) {
          if (err) return done(err);

          assert.equal(Object.keys(networks).length, 2, "Should have results for two networks from profiler");
          assert.equal(Object.keys(networks["primary"]).length, 3, "Primary network should have three contracts deployed");
          assert.equal(networks["primary"]["MetaCoin"], currentAddresses["MetaCoin"], "MetaCoin contract updated on primary network");
          assert.equal(networks["primary"]["ConvertLib"], currentAddresses["ConvertLib"], "ConvertLib library updated on primary network");
          assert.equal(networks["primary"]["Migrations"], currentAddresses["Migrations"], "Migrations contract updated on primary network");
          assert.equal(Object.keys(networks["secondary"]).length, 3, "Secondary network should have three contracts deployed");
          assert.isNotNull(networks["secondary"]["MetaCoin"], "MetaCoin contract should have an address on secondary network");
          assert.isNotNull(networks["secondary"]["ConvertLib"], "ConvertLib library should have an address on secondary network");
          assert.isNotNull(networks["secondary"]["Migrations"], "Migrations contract should have an address on secondary network");

          Object.keys(networks["primary"]).forEach(function(contract_name) {
            assert.notEqual(networks["secondary"][contract_name], networks["primary"][contract_name], "Contract " + contract_name + " has the same address on both networks")
          });

          done();
        });
      });
    });
  });

  it("should ignore files that don't start with a number", function(done) {
    fs.writeFileSync(path.join(config.migrations_directory, "~2_deploy_contracts.js"), "module.exports = function() {};", "utf8");

    Migrate.assemble(config, function(err, migrations) {
      if (err) return done(err);

      assert.equal(migrations.length, 2, "~2_deploy_contracts.js should have been ignored!");

      done();
    });
  });

  it("should ignore non-js extensions", function(done) {
    fs.writeFileSync(path.join(config.migrations_directory, "2_deploy_contracts.js~"), "module.exports = function() {};", "utf8");

    Migrate.assemble(config, function(err, migrations) {
      if (err) return done(err);

      assert.equal(migrations.length, 2, "2_deploy_contracts.js~ should have been ignored!");

      done();
    });
  });
});
