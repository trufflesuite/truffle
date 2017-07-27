var Init = require("truffle-init");
var MemoryLogger = require("../memorylogger");
var CommandRunner = require("../commandrunner");
var contract = require("truffle-contract");
var fs = require("fs-extra");
var path = require("path");
var assert = require("assert");
var TestRPC = require("ethereumjs-testrpc");
var Reporter = require("../reporter");
var temp = require("temp").track();

describe("Source File Updates", function() {
  var config;
  var logger = new MemoryLogger();
  var dependedContractPath;


  before("set up sandbox", function(done) {
    this.timeout(10000);
    Init.sandbox("bare", function(err, conf) {
      if (err) return done(err);
      config = conf;
      config.logger = logger;
      config.networks.development.provider = TestRPC.provider();
      config.mocha = {
        reporter: new Reporter(logger)
      }
      done();
    });
  });

  before("copy the depended contract to a test directory", function(done) {
    temp.mkdir("updates-test-", function(err, dirPath) {
      dependedContractPath = path.join(dirPath, "DependedContract.sol");

      // Copy the depended contract to the temp directory.
      fs.copy(path.join(__dirname, "DependedContract.sol"), dependedContractPath, done);
    });
  });

  before("dynamically create contract and add migration", function() {
    // Note: DependedContract is supposed to exist outside of the project, which is why we're
    // creating the contract on the fly.
    var MainContractSource = "pragma solidity ^0.4.2; import '" + dependedContractPath + "'; contract MainContract {}";

    fs.outputFileSync(path.join(config.contracts_directory, "MainContract.sol"), MainContractSource);
    fs.copySync(path.join(__dirname, "2_deploy_contract.js.template"), path.join(config.migrations_directory, "2_deploy_contract.js"));
  });

  it("will compile with a file that exists outside of the contracts directory", function(done) {
    this.timeout(20000);

    CommandRunner.run("compile", config, function(err) {
      if (err) return done(err);

      // The contract's name is Contract, but the file name is contract.
      // Not only should we not receive an error, but we should receive contract
      // artifacts relative to the contract name and not the file name.
      assert(fs.existsSync(path.join(config.contracts_build_directory, "MainContract.json")));
      assert(fs.existsSync(path.join(config.contracts_build_directory, "DependedContract.json")));

      done();
    });
  });

  it("will recompile the depended contract when it's updated", function(done) {
    this.timeout(20000);

    var dependedContractArtifactPath = path.join(config.contracts_build_directory, "DependedContract.json");

    var dependedContractArtifacts = fs.readFileSync(dependedContractArtifactPath, "utf8");
    dependedContractArtifacts = JSON.parse(dependedContractArtifacts);

    var oldUpdatedTimeOfDependedContract = new Date(dependedContractArtifacts.updatedAt).getTime();

    // Update the modification time of the depended contract to simulate an edit.
    var newTime = new Date().getTime();
    fs.utimesSync(dependedContractPath, newTime, newTime);

    CommandRunner.run("compile", config, function(err) {
      if (err) return done(err);

      var newDependedContractArtifacts = fs.readFileSync(dependedContractArtifactPath, "utf8");
      newDependedContractArtifacts = JSON.parse(newDependedContractArtifacts);

      var newUpdatedTimeOfDependedContract = new Date(newDependedContractArtifacts.updatedAt).getTime();

      assert(newUpdatedTimeOfDependedContract > oldUpdatedTimeOfDependedContract);

      done();
    });
  });

  // This one is controversial: If the depended source file is removed, no source files
  // that still exist have changed; therefore, Truffle (currently) thinks that nothing
  // needs to be recompiled. If we do error in this case, it would mean that any old
  // artifacts would cause `truffle compile` to error -- which we don't really want because
  // the user may want to keep some old artifacts, and it's not our business to delete them.
  it("shouldn't error if the depended source file is removed", function(done) {
    fs.removeSync(dependedContractPath);

    CommandRunner.run("compile", config, function(err) {
      if (err) return done(err);

      // If we're here, no errors.
      done();
    });
  });

  it("will error if the main contract is updated after the depended contarct is removed", function(done) {
    var mainContractPath = path.join(config.contracts_directory, "MainContract.sol");

    // Update the modification time of the depended contract to simulate an edit.
    var newTime = new Date().getTime();
    fs.utimesSync(mainContractPath, newTime, newTime);

    CommandRunner.run("compile", config, function(err) {
      // We expect an error, so if we get one everything's groovy.
      if (err) return done();

      // No error? Well that's the pits.
      done(new Error("We expected an error. Where is it??"));
    });
  });
});
