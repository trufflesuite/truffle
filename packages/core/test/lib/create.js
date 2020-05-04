const assert = require("chai").assert;
const path = require("path");
const fse = require("fs-extra");
const glob = require("glob");
const Box = require("@truffle/box");
const Create = require("../../lib/commands/create/helpers");
const Resolver = require("@truffle/resolver");
const Artifactor = require("@truffle/artifactor");

describe("create", function() {
  let config;

  before("Create a sandbox", async () => {
    config = await Box.sandbox("default");
    config.resolver = new Resolver(config);
    config.artifactor = new Artifactor(config.contracts_build_directory);
  });

  after("Cleanup tmp files", function(done) {
    glob("tmp-*", (err, files) => {
      if (err) done(err);
      files.forEach(file => fse.removeSync(file));
      done();
    });
  });

  it("creates a new contract", function(done) {
    Create.contract(config.contracts_directory, "MyNewContract", function(err) {
      if (err) return done(err);

      const expectedFile = path.join(
        config.contracts_directory,
        "MyNewContract.sol"
      );
      assert.isTrue(
        fse.existsSync(expectedFile),
        `Contract to be created doesns't exist, ${expectedFile}`
      );

      const fileData = fse.readFileSync(expectedFile, { encoding: "utf8" });
      assert.isNotNull(fileData, "File's data is null");
      assert.notEqual(fileData, "", "File's data is blank");
      assert.isTrue(
        fileData.includes("pragma solidity >= 0.5.0 < 0.7.0;"),
        "File's solidity version does not match >= 0.5.0 < 0.7.0"
      );
      done();
    });
  });

  it("will not overwrite an existing contract (by default)", function(done) {
    Create.contract(config.contracts_directory, "MyNewContract2", function(
      err
    ) {
      if (err) return done(err);

      const expectedFile = path.join(
        config.contracts_directory,
        "MyNewContract2.sol"
      );
      assert.isTrue(
        fse.existsSync(expectedFile),
        `Contract to be created doesns't exist, ${expectedFile}`
      );

      Create.contract(config.contracts_directory, "MyNewContract2", function(
        err
      ) {
        assert(err.message.includes("file exists"));
        done();
      });
    });
  });

  it("will overwrite an existing contract if the force option is enabled", function(done) {
    Create.contract(config.contracts_directory, "MyNewContract3", function(
      err
    ) {
      if (err) return done(err);

      const expectedFile = path.join(
        config.contracts_directory,
        "MyNewContract3.sol"
      );
      assert.isTrue(
        fse.existsSync(expectedFile),
        `Contract to be created doesns't exist, ${expectedFile}`
      );

      const options = { force: true };
      Create.contract(
        config.contracts_directory,
        "MyNewContract3",
        options,
        function(err) {
          assert(err === null);
          done();
        }
      );
    });
  });

  it("creates a new test", function(done) {
    Create.test(config.test_directory, "MyNewTest", function(err) {
      if (err) return done(err);

      const expectedFile = path.join(config.test_directory, "my_new_test.js");
      assert.isTrue(
        fse.existsSync(expectedFile),
        `Test to be created doesns't exist, ${expectedFile}`
      );

      const fileData = fse.readFileSync(expectedFile, { encoding: "utf8" });
      assert.isNotNull(fileData, "File's data is null");
      assert.notEqual(fileData, "", "File's data is blank");

      done();
    });
  }); // it

  it("creates a new migration", function(done) {
    Create.migration(config.migrations_directory, "MyNewMigration", function(
      err
    ) {
      if (err) return done(err);
      const files = glob.sync(`${config.migrations_directory}${path.sep}*`);

      const found = false;
      const expectedSuffix = "_my_new_migration.js";

      for (let file of files) {
        if (
          file.indexOf(expectedSuffix) ===
          file.length - expectedSuffix.length
        ) {
          const fileData = fse.readFileSync(file, { encoding: "utf8" });
          assert.isNotNull(fileData, "File's data is null");
          assert.notEqual(fileData, "", "File's data is blank");

          return done();
        }
      }

      if (found === false) {
        assert.fail("Could not find a file that matched expected name");
      }
    });
  }); // it
}).timeout(10000);
