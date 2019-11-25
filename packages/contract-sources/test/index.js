const assert = require("chai").assert;
const Box = require("@truffle/box");
const fse = require("fs-extra");
const glob = require("glob");
const path = require("path");
const async = require("async");
const Contracts = require("@truffle/workflow-compile");
const { resolveSource } = require("../index");

describe("sources integration", function() {
  let config;
  const moduleSource =
    "pragma solidity ^0.5.0; import './ModuleDependency.sol'; contract Module {}";
  const moduleDependencySource =
    "pragma solidity ^0.5.0; contract ModuleDependency {}";
  const parentContractSource =
    "pragma solidity ^0.5.0; import 'fake_source/contracts/Module.sol'; contract Parent {}";

  before("Create a sandbox and fake npm source", async () => {
    config = await Box.sandbox("default");
    fse.writeFileSync(
      path.join(config.contracts_directory, "Parent.sol"),
      parentContractSource,
      { encoding: "utf8" }
    );
    const fakeSourcePath = path.join(
      config.working_directory,
      "node_modules",
      "fake_source",
      "contracts"
    );
    fse.ensureDirSync(fakeSourcePath);
    fse.writeFileSync.bind(
      fse,
      path.join(fakeSourcePath, "Module.sol"),
      moduleSource,
      { encoding: "utf8" }
    )();
    fse.writeFileSync.bind(
      fse,
      path.join(fakeSourcePath, "ModuleDependency.sol"),
      moduleDependencySource,
      { encoding: "utf8" }
    )();
  });

  after("Cleanup tmp files", function() {
    const files = glob.sync("tmp-*");
    files.forEach(file => fse.removeSync(file));
  });

  it("successfully finds the correct source via Sources lookup", function() {
    const { body } = resolveSource(
      "fake_source/contracts/Module.sol",
      config.sources,
      config
    );
    assert.equal(body, moduleSource);
  });

  it("errors when module does not exist from any source", function() {
    try {
      resolveSource(
        "some_source/contracts/SourceDoesNotExist.sol",
        config.sources,
        config
      );
      assert.fail("Source lookup should have failed.");
    } catch (error) {
      assert.equal(
        error.message,
        "Could not find some_source/contracts/SourceDoesNotExist.sol from any sources"
      );
    }
  });

  it("contract compiliation successfully picks up modules and their dependencies", async function() {
    this.timeout(10000);

    const { contracts } = await Contracts.compile(config.with({ quiet: true }));
    const contractNames = Object.keys(contracts);

    assert.include(contractNames, "Parent");
    assert.include(contractNames, "Module");
    assert.include(contractNames, "ModuleDependency");
  });
});
