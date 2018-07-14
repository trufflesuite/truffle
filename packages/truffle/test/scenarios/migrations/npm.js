const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const fs = require("fs");
const path = require("path");
const contract = require("truffle-contract");
const assert = require("assert");
const Server = require("../server");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");
const Web3 = require('web3');

const log = console.log;

const util = require('util');

function processErr(err, output){
  if (err){
    log(output);
    throw new Error(err);
  }
}

describe("NPM dependencies", function() {

  let config;
  let web3;
  let networkId;
  const project = path.join(__dirname, '../../sources/migrations/npm');
  const logger = new MemoryLogger();

  before(done => Server.start(done));
  after(done => Server.stop(done));

  before(async function() {
    this.timeout(10000);
    config = await sandbox.create(project)
    config.network = "development";
    config.logger = logger;
    config.mocha = {
      reporter: new Reporter(logger)
    }

    const provider = new Web3.providers.HttpProvider('http://localhost:8545')
    web3 = new Web3(provider);
    networkId = await web3.eth.net.getId();
  });

  it("will compile", function(done) {
    this.timeout(20000);

    CommandRunner.run("compile", config, function(err) {
      var output = logger.contents();
      processErr(err, output)

      assert(fs.existsSync(path.join(config.contracts_build_directory, "Contract.json")));
      assert(fs.existsSync(path.join(config.contracts_build_directory, "Migrations.json")));

      done();
    });
  });

  it.skip("will do a dry run migration", function(done) {
    // this should work but I think something gets mutated in this test
    // causing the later non-dry-run migration test to fail
    this.timeout(50000);

    CommandRunner.run("migrate --dry-run", config, function(err) {
      var output = logger.contents();
      processErr(err, output);

      const buildDir = config.contracts_build_directory;

      const contractArtifact = require(path.join(buildDir, "Contract.json"));
      const migrationArtifact = require(path.join(buildDir, "Migrations.json"))
      const extraLibArtifact = require(path.join(
        config.working_directory,
        "node_modules",
        "@org",
        "pkg",
        "build",
        "contracts",
        "ExtraLibrary.json"
      ));

      const Contract = contract(contractArtifact);
      const Migrations = contract(migrationArtifact);
      const ExtraLibrary = contract(extraLibArtifact);

      const promises = [];

      [Contract, ExtraLibrary, Migrations].forEach(function(abstraction) {
        abstraction.setProvider(config.provider);

        promises.push(abstraction.deployed().then(function(instance) {
          return Promise.reject(new Error("found instance for " + instance.contractName));
        }, function() { return Promise.resolve(); }));
      });

      Promise.all(promises).then(function() {
        done();
      }).catch(done);
    });
  });

  it("will run tests", function(done) {
    this.timeout(70000);
    CommandRunner.run("test", config, function(err) {
      var output = logger.contents();

      if (!err && output.indexOf("6 passing") < 0) {
        err = new Error("a test case failed");
      }

      processErr(err, output);

      done();
    });
  });

  it("will migrate", function(done) {
    this.timeout(70000);

    CommandRunner.run("migrate", config, function(err) {
      var output = logger.contents();
      processErr(err, output);

      const buildDir = config.contracts_build_directory;

      const contract3Artifact = require(path.join(buildDir, "Contract3.json"));
      const migrationArtifact = require(path.join(buildDir, "Migrations.json"))
      const extraLibArtifact = require(path.join(
        config.working_directory,
        "node_modules",
        "@org",
        "pkg",
        "build",
        "contracts",
        "ExtraLibrary.json"
      ));

      const Contract3 = contract(contract3Artifact);
      const Migrations = contract(migrationArtifact);
      const ExtraLibrary = contract(extraLibArtifact);

      const promises = [];

      [Contract3, ExtraLibrary, Migrations].forEach(function(abstraction) {
        abstraction.setProvider(config.provider);

        promises.push(abstraction.deployed().then(function(instance) {
          assert.notEqual(instance.address, null, instance.contractName + " didn't have an address!")
        }));
      });

      Promise.all(promises).then(function() {
        done();
      }).catch(done);
    });
  });
});
