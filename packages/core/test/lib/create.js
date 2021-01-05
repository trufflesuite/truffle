const assert = require("chai").assert;
const path = require("path");
const fse = require("fs-extra");
const glob = require("glob");
const Box = require("@truffle/box");
const Create = require("../../lib/commands/create/helpers");
const Resolver = require("@truffle/resolver");
const Artifactor = require("@truffle/artifactor");

describe("create", function () {
  let config;

  before("Create a sandbox", async () => {
    config = await Box.sandbox("default");
    config.resolver = new Resolver(config);
    config.artifactor = new Artifactor(config.contracts_build_directory);
  });

  after("Cleanup tmp files", async () => {
    const files = glob.sync("tmp-*");
    files.forEach(file => fse.removeSync(file));
  });

  it("creates a new contract", async () => {
    await Create.contract(config.contracts_directory, "MyNewContract", {});

    const expectedFile = path.join(
      config.contracts_directory,
      "MyNewContract.sol"
    );
    assert.isTrue(
      fse.existsSync(expectedFile),
      `Contract to be created doesn't exist, ${expectedFile}`
    );

    const fileData = fse.readFileSync(expectedFile, {encoding: "utf8"});
    assert.isNotNull(fileData, "File's data is null");
    assert.notEqual(fileData, "", "File's data is blank");
    assert.isTrue(
      fileData.includes("pragma solidity >=0.4.22 <0.9.0;"),
      "File's solidity version does not match >=0.4.22 <0.9.0"
    );
  });

  it("will not overwrite an existing contract (by default)", async () => {
    await Create.contract(config.contracts_directory, "MyNewContract2", {});

    const expectedFile = path.join(
      config.contracts_directory,
      "MyNewContract2.sol"
    );
    assert.isTrue(
      fse.existsSync(expectedFile),
      `Contract to be created doesn't exist, ${expectedFile}`
    );

    try {
      await Create.contract(config.contracts_directory, "MyNewContract2", {});
      assert.fail();
    } catch (error) {
      assert(error.message.includes("file exists"));
    }
  });

  it("will overwrite an existing contract if the force option is enabled", async () => {
    await Create.contract(config.contracts_directory, "MyNewContract3", {});

    const expectedFile = path.join(
      config.contracts_directory,
      "MyNewContract3.sol"
    );
    assert.isTrue(
      fse.existsSync(expectedFile),
      `Contract to be created doesns't exist, ${expectedFile}`
    );

    const options = {force: true};
    await Create.contract(
      config.contracts_directory,
      "MyNewContract3",
      options
    );
  });

  it("creates a new test", async () => {
    await Create.test(config.test_directory, "MyNewTest", {});

    const expectedFile = path.join(config.test_directory, "my_new_test.js");
    assert.isTrue(
      fse.existsSync(expectedFile),
      `Test to be created doesns't exist, ${expectedFile}`
    );

    const fileData = fse.readFileSync(expectedFile, {encoding: "utf8"});
    assert.isNotNull(fileData, "File's data is null");
    assert.notEqual(fileData, "", "File's data is blank");
  });

  it("creates a new migration", async () => {
    await Create.migration(config.migrations_directory, "MyNewMigration", {});
    const files = glob.sync(`${config.migrations_directory}${path.sep}*`);

    const found = false;
    const expectedSuffix = "_my_new_migration.js";

    for (let file of files) {
      if (
        file.indexOf(expectedSuffix) ===
        file.length - expectedSuffix.length
      ) {
        const fileData = fse.readFileSync(file, {encoding: "utf8"});
        assert.isNotNull(fileData, "File's data is null");
        assert.notEqual(fileData, "", "File's data is blank");
        return;
      }
    }

    if (found === false) {
      assert.fail("Could not find a file that matched expected name");
    }
  });
}).timeout(10000);
