const assert = require("chai").assert;
const { default: Box } = require("@truffle/box");
const fs = require("fs-extra");
const glob = require("glob");
const path = require("path");
const WorkflowCompile = require("@truffle/workflow-compile");
const Package = require("../lib/package.js");
const Blockchain = require("@truffle/blockchain-utils");
const Ganache = require("ganache");
const Resolver = require("@truffle/resolver");
const Artifactor = require("@truffle/artifactor");

describe.skip("EthPM integration", function () {
  var config;
  var host;
  var registry;
  var provider;
  var blockchain_uri;

  function assertFile(file_path) {
    try {
      var stat = fs.statSync(file_path);
    } catch (e) {
      throw new Error("File '" + file_path + "' should exist");
    }
    assert.isTrue(
      stat.isFile(),
      "File '" + file_path + "' should exist as a file"
    );
  }

  beforeEach("Create a Ganache provider and get a blockchain uri", function (
    done
  ) {
    provider = Ganache.provider();

    Blockchain.asURI(provider, function (err, uri) {
      if (err) return done(err);
      blockchain_uri = uri;
      done();
    });
  });

  // Super slow doing these in a beforeEach, but it ensures nothing conflicts.
  beforeEach("Create a sandbox", function (done) {
    this.timeout(20000);
    Box.sandbox(function (err, result) {
      if (err) return done(err);
      config = result;
      config.resolver = new Resolver(config);
      config.artifactor = new Artifactor(config.contracts_build_directory);
      config.networks = {
        development: {
          network_id: blockchain_uri,
          provider: provider
        }
      };
      config.network = "development";
      done();
    });
  });

  beforeEach("Create a fake EthPM host and memory registry", function (done) {
    this.timeout(30000); // I've had varrying runtimes with this block, likely due to networking.

    GithubExamples.initialize(
      {
        blockchain: blockchain_uri
      },
      function (err, results) {
        if (err) return done(err);

        host = results.host;
        registry = results.registry;

        done();
      }
    );
  });

  after("Cleanup tmp files", function (done) {
    glob("tmp-*", (err, files) => {
      if (err) done(err);
      files.forEach(file => fs.removeSync(file));
      done();
    });
  });

  // afterEach("stop ipfs server", function(done) {
  //   this.timeout(10000);
  //
  //   var called = false;
  //   // The callback gets called more than once...
  //   try {
  //     ipfs_daemon.stopDaemon(function() {
  //       if (called == false) {
  //         called = true;
  //         done();
  //       }
  //     });
  //   } catch (e) {
  //     // do nothing
  //   }
  // });

  it("successfully installs single dependency from EthPM", async function () {
    this.timeout(30000); // Giving ample time for requests to time out.

    await Package.install(
      config.with({
        ethpm: {
          ipfs_host: host,
          registry: registry,
          provider: provider
        },
        packages: ["owned"]
      })
    );
    const expectedInstallDirectory = path.resolve(
      path.join(config.working_directory, "installed_contracts", "owned")
    );

    assertFile(path.join(expectedInstallDirectory, "ethpm.json"));
    assertFile(path.join(expectedInstallDirectory, "contracts", "owned.sol"));
  });

  it("successfully installs and provisions a package with dependencies from EthPM", async function () {
    this.timeout(30000); // Giving ample time for requests to time out.
    this.retries(2);

    await Package.install(
      config.with({
        ethpm: {
          ipfs_host: host,
          registry: registry,
          provider: provider
        },
        packages: ["transferable"]
      })
    );
    const expectedInstallDirectory = path.resolve(
      path.join(config.working_directory, "installed_contracts")
    );

    assertFile(
      path.join(expectedInstallDirectory, "transferable", "ethpm.json")
    );
    assertFile(
      path.join(
        expectedInstallDirectory,
        "transferable",
        "contracts",
        "transferable.sol"
      )
    );
    assertFile(path.join(expectedInstallDirectory, "owned", "ethpm.json"));
    assertFile(
      path.join(expectedInstallDirectory, "owned", "contracts", "owned.sol")
    );

    // Write a contract that uses transferable, so it will be compiled.
    const contractSource =
      "pragma solidity ^0.4.2; import 'transferable/transferable.sol'; contract MyContract {}";

    fs.writeFileSync(
      path.join(config.contracts_directory, "MyContract.sol"),
      contractSource,
      "utf8"
    );

    // Compile all contracts, then provision them and see if we get contracts from our dependencies.
    const { contracts } = await WorkflowCompile.compileAndSave(
      config.with({
        all: true,
        quiet: true
      })
    );
    const contractNames = contracts.reduce((a, contract) => {
      return a.concat(contract.contractName);
    }, []);
    assert.isNotNull(contractNames["owned"]);
    assert.isNotNull(contractNames["transferable"]);
    const files = fs.readdirSync(config.contracts_build_directory);

    const found = [false, false];
    const search = ["owned", "transferable"];

    search.forEach((contract_name, index) => {
      files.forEach(file => {
        if (path.basename(file, ".json") === contract_name) {
          found[index] = true;
        }
      });
    });

    found.forEach((isFound, index) => {
      assert(
        isFound,
        "Could not find built binary with name '" + search[index] + "'"
      );
    });
  });

  // For each of these examples, sources exist. However, including sources isn't required. This test
  // treats the package as if it had no sources; to do so, we simply don't compile its code.
  // In addition, this package contains deployments. We need to make sure these deployments are available.
  it("successfully installs and provisions a deployed package with network artifacts from EthPM, without compiling", function (done) {
    this.timeout(30000); // Giving ample time for requests to time out.

    Package.install(
      config.with({
        ethpm: {
          ipfs_host: host,
          registry: registry,
          provider: provider
        },
        packages: ["safe-math-lib"]
      }),
      function (err) {
        if (err) return done(err);

        // Make sure we can resolve it.
        var expected_contract_name = "SafeMathLib";
        var SafeMathLib = config.resolver.require(
          "safe-math-lib/contracts/SafeMathLib.sol"
        );
        assert.equal(
          SafeMathLib.contract_name,
          expected_contract_name,
          "Could not find provisioned contract with name '" +
            expected_contract_name +
            "'"
        );

        // Ensure we didn't resolve a local path.
        var found = false;
        try {
          fs.statSync(
            path.join(config.contracts_build_directory, "SafeMathLib.json")
          );
          found = true;
        } catch (e) {
          // Should have gotten here because statSync should have errored.
        }

        if (found) {
          assert.fail("Expected SafeMathLib.json not to exist");
        }

        var expected_lockfile_path = path.join(
          config.working_directory,
          "installed_contracts",
          "safe-math-lib",
          "lock.json"
        );

        var lockfile = fs.readFileSync(expected_lockfile_path, "utf8");
        lockfile = JSON.parse(lockfile);

        // Make sure the blockchain was inserted correctly (really a function of GithubExamples).
        assert.ok(
          lockfile.deployments,
          "No deployments when a deployment was expected"
        );
        assert.ok(
          lockfile.deployments[blockchain_uri],
          "No deployments to the expected blockchain"
        );
        assert.ok(
          lockfile.deployments[blockchain_uri][expected_contract_name],
          expected_contract_name +
            " does nto appear in deployed contracts for expected blockchain"
        );

        // Finally assert the address.
        assert.equal(
          SafeMathLib.address,
          lockfile.deployments[blockchain_uri][expected_contract_name].address,
          "Address in contract doesn't match address in lockfile"
        );

        done();
      }
    );
  });
});
