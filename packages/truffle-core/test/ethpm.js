var assert = require("chai").assert;
var Init = require("../lib/init");
var fs = require("fs");
var path = require('path');
var mkdirp = require("mkdirp");
var async = require("async");
var Sources = require("../lib/sources.js");
var Contracts = require("../lib/contracts.js");
var Package = require("../lib/package.js");
var Blockchain = require("../lib/blockchain");
var EthPM = require("ethpm");
var GithubExamples = require("ethpm/lib/indexes/github-examples");
var TestRPC = require("ethereumjs-testrpc");

describe('EthPM integration', function() {
  var config;
  var host;
  var registry;
  var ipfs_api;
  var ipfs_daemon;
  var provider;
  var blockchain_uri;

  function assertFile(file_path) {
    try {
      var stat = fs.statSync(file_path);
    } catch (e) {
      throw new Error("File '" + file_path + "' should exist");
    }
    assert.isTrue(stat.isFile(), "File '" + file_path + "' should exist as a file");
  }

  beforeEach("Create a TestRPC provider and get a blockchain uri", function(done) {
    provider = TestRPC.provider();

    Blockchain.asURI(provider, function(err, uri) {
      if (err) return done(err);
      blockchain_uri = uri;
      done();
    });
  });

  // Super slow doing these in a beforeEach, but it ensures nothing conflicts.
  beforeEach("Create a sandbox", function(done) {
    this.timeout(10000);
    Init.sandbox({
      provider: provider
    }, function(err, result) {
      if (err) return done(err);
      config = result;
      done();
    });
  });

  beforeEach("Create a fake EthPM host and memory registry", function(done) {
    this.timeout(30000); // I've had varrying runtimes with this block, likely due to networking.

    GithubExamples.initialize({
      blockchain: blockchain_uri
    }, function(err, results) {
      if (err) return done(err);

      host = results.host;
      registry = results.registry;
      ipfs_api = results.ipfs_api;
      ipfs_daemon = results.ipfs_daemon;

      done();
    });
  });

  afterEach("stop ipfs server", function(done) {
    this.timeout(10000);

    var called = false;
    // The callback gets called more than once...
    ipfs_daemon.killProcess(function() {
      if (called == false) {
        called = true;
        done();
      }
    });
  });

  it("successfully installs single dependency from EthPM", function(done) {
    this.timeout(10000); // Giving ample time for requests to time out.

    Package.install(config.with({
      ethpm: {
        host: host,
        registry: registry
      },
      package_name: "owned"
    }), function(err) {
      if (err) return done(err);

      var expected_install_directory = path.resolve(path.join(config.working_directory, "installed_contracts", "owned"));

      assertFile(path.join(expected_install_directory, "epm.json"));
      assertFile(path.join(expected_install_directory, "contracts", "owned.sol"));

      done();
    });
  });

  it("successfully installs and provisions a package with dependencies from EthPM", function(done) {
    this.timeout(10000); // Giving ample time for requests to time out.

    Package.install(config.with({
      ethpm: {
        host: host,
        registry: registry
      },
      package_name: "transferable"
    }), function(err) {
      if (err) return done(err);

      var expected_install_directory = path.resolve(path.join(config.working_directory, "installed_contracts"));

      assertFile(path.join(expected_install_directory, "transferable", "epm.json"));
      assertFile(path.join(expected_install_directory, "transferable", "contracts", "transferable.sol"));
      assertFile(path.join(expected_install_directory, "owned", "epm.json"));
      assertFile(path.join(expected_install_directory, "owned", "contracts", "owned.sol"));

      // Write a contract that uses transferable, so it will be compiled.
      var contractSource = "pragma solidity ^0.4.2; import 'transferable/transferable.sol'; contract MyContract {}";

      fs.writeFileSync(path.join(config.contracts_directory, "MyContract.sol"), contractSource, "utf8");

      // Compile all contracts, then provision them and see if we get contracts from our dependencies.
      Contracts.compile(config.with({
        all: true,
        quiet: true
      }), function(err, contracts) {
        if (err) return done(err);

        assert.isNotNull(contracts["owned"]);
        assert.isNotNull(contracts["transferable"]);

        Contracts.provision(config, false, function(err, contracts) {
          if (err) return done(err);

          var found = [false, false];
          var search = ["owned", "transferable"];

          search.forEach(function(contract_name, index) {
            contracts.forEach(function(contract) {
              if (contract.contract_name == contract_name) {
                found[index] = true;
              }
            });
          });

          found.forEach(function(isFound, index) {
            assert(isFound, "Could not find provisioned contract with name '" + search[index] + "'");
          });

          done();
        });
      });
    });
  });

  // For each of these examples, sources exist. However, including sources isn't required. This test
  // treats the package as if it had no sources; to do so, we simply don't compile its code.
  // In addition, this package contains deployments. We need to make sure these deployments are available.
  it("successfully installs and provisions a deployed package with network artifacts from EthPM, without compiling", function(done) {
    this.timeout(10000); // Giving ample time for requests to time out.

    Package.install(config.with({
      ethpm: {
        host: host,
        registry: registry
      },
      package_name: "safe-math-lib"
    }), function(err) {
      if (err) return done(err);

      Contracts.provision(config, false, function(err, contracts) {
        if (err) return done(err);

        var expected_contract_name = "SafeMathLib";
        assert.notEqual(contracts.length, 0);
        assert.equal(contracts[0].contract_name, expected_contract_name, "Could not find provisioned contract with name '" + expected_contract_name + "'");

        var expected_lockfile_path = path.join(config.working_directory, "installed_contracts", "safe-math-lib", "lock.json")

        var lockfile = fs.readFileSync(expected_lockfile_path, "utf8");
        lockfile = JSON.parse(lockfile);

        // Make sure the blockchain was inserted correctly (really a function of GithubExamples).
        assert.ok(lockfile.deployments, "No deployments when a deployment was expected");
        assert.ok(lockfile.deployments[blockchain_uri], "No deployments to the expected blockchain");
        assert.ok(lockfile.deployments[blockchain_uri][expected_contract_name], expected_contract_name + " does nto appear in deployed contracts for expected blockchain");

        // Finally assert the address.
        assert.equal(contracts[0].address, lockfile.deployments[blockchain_uri][expected_contract_name].address, "Address in contract doesn't match address in lockfile");

        done();
      });
    });
  });

  // it('successfully finds the correct source via Sources lookup', function(done) {
  //   Sources.find("fake_source/contracts/Module.sol", config.sources, function(err, body) {
  //     if (err) return done(err);
  //
  //     assert.equal(body, moduleSource);
  //     done();
  //   });
  // });

  // it("errors when module does not exist from any source", function(done) {
  //   Sources.find("some_source/contracts/SourceDoesNotExist.sol", config.sources, function(err, body) {
  //     if (!err) {
  //       return assert.fail("Source lookup should have errored but didn't");
  //     }
  //
  //     assert.equal(err.message, "Could not find some_source/contracts/SourceDoesNotExist.sol from any sources");
  //     done();
  //   });
  // });
  //
  // it("contract compiliation successfully picks up modules and their dependencies", function(done) {
  //   this.timeout(10000);
  //
  //   Contracts.compile(config.with({
  //     quiet: true
  //   }), function(err, contracts) {
  //     if (err) return done(err);
  //
  //     var contractNames = Object.keys(contracts);
  //
  //     assert.include(contractNames, "Parent");
  //     assert.include(contractNames, "Module");
  //     assert.include(contractNames, "ModuleDependency");
  //
  //     done();
  //   })
  // });
});
