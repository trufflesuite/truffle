var assert = require("chai").assert;
var Box = require("@truffle/box");
var glob = require("glob");
var path = require("path");
var fse = require("fs-extra");
var Resolver = require("@truffle/resolver");
var Artifactor = require("@truffle/artifactor");
var Contracts = require("@truffle/workflow-compile");

describe("NPM integration", function() {
  var config;
  var moduleSource =
    "pragma solidity ^0.5.0; import './ModuleDependency.sol'; contract Module {}";
  var moduleDependencySource =
    "pragma solidity ^0.5.0; contract ModuleDependency {}";
  var parentContractSource =
    "pragma solidity ^0.5.0; import 'fake_source/contracts/Module.sol'; contract Parent {}";

  before("Create a sandbox", async () => {
    config = await Box.sandbox("default");
    config.resolver = new Resolver(config);
    config.artifactor = new Artifactor(config.contracts_build_directory);
    config.networks = {
      development: {
        network_id: 1
      }
    };
    config.network = "development";

    fse.writeFileSync(
      path.join(config.contracts_directory, "Parent.sol"),
      parentContractSource,
      { encoding: "utf8" }
    );
  });

  before("Create a fake npm source", () => {
    const fakeSourcePath = path.join(
      config.working_directory,
      "node_modules",
      "fake_source",
      "contracts"
    );

    fse.ensureDirSync(fakeSourcePath);
    fse.writeFileSync(path.join(fakeSourcePath, "Module.sol"), moduleSource, {
      encoding: "utf8"
    });
    fse.writeFileSync(
      path.join(fakeSourcePath, "ModuleDependency.sol"),
      moduleDependencySource,
      { encoding: "utf8" }
    );
  });

  after("Cleanup tmp files", function(done) {
    glob("tmp-*", (err, files) => {
      if (err) done(err);
      files.forEach(file => fse.removeSync(file));
      done();
    });
  });

  it("successfully finds the correct source via Sources lookup", async function() {
    const { body } = await config.resolver.resolve(
      "fake_source/contracts/Module.sol",
      config.sources
    );
    assert.equal(body, moduleSource);
  });

  it("errors when module does not exist from any source", async function() {
    try {
      await config.resolver.resolve(
        "some_source/contracts/SourceDoesNotExist.sol",
        config.sources
      );
    } catch (err) {
      assert.equal(
        err.message,
        "Could not find some_source/contracts/SourceDoesNotExist.sol from any sources"
      );

      return;
    }

    // should not be reached
    assert.fail("Source lookup should have errored but didn't");
  });

  it("contract compiliation successfully picks up modules and their dependencies", function(done) {
    this.timeout(10000);

    Contracts.compile(
      config.with({
        quiet: true
      }),
      function(err, result) {
        if (err) return done(err);
        let { contracts } = result;

        var contractNames = Object.keys(contracts);

        assert.include(contractNames, "Parent");
        assert.include(contractNames, "Module");
        assert.include(contractNames, "ModuleDependency");

        done();
      }
    );
  });
}).timeout(10000);
