var Box = require("truffle-box");
var MemoryLogger = require("../memorylogger");
var CommandRunner = require("../commandrunner");
var contract = require("truffle-contract");
var fs = require("fs-extra");
var path = require("path");
var assert = require("assert");
var Server = require("../server");
var Reporter = require("../reporter");

describe("NPM dependencies", function() {
  var config;
  var logger = new MemoryLogger();

  before("set up the server", function(done) {
    Server.start(done);
  });

  after("stop server", function(done) {
    Server.stop(done);
  });

  before("set up sandbox", function(done) {
    this.timeout(10000);
    Box.sandbox("bare", function(err, conf) {
      if (err) return done(err);
      config = conf;
      config.network = "development";
      config.logger = logger;
      config.mocha = {
        reporter: new Reporter(logger)
      }
      done();
    });
  });

  before("add contract and migration", function() {
    fs.copySync(path.join(__dirname, "contract.sol"), path.join(config.contracts_directory, "contract.sol"));
    fs.copySync(path.join(__dirname, "2_deploy_contract.js.template"), path.join(config.migrations_directory, "2_deploy_contract.js"));
    fs.copySync(path.join(__dirname, "root-package.json"), path.join(config.working_directory, "package.json"));
    fs.copySync(path.join(__dirname, "test-contracts.js.template"), path.join(config.working_directory, "test", "test-contracts.js"));

    var dep1Root = path.join(config.working_directory, "node_modules", "@org", "pkg")
    fs.copySync(path.join(__dirname, "extralib.sol"), path.join(dep1Root, "contracts", "extralib.sol"));
    fs.copySync(path.join(config.migrations_directory, "1_initial_migration.js"), path.join(dep1Root, "migrations", "1_initial_migration.js"));
    fs.copySync(path.join(config.contracts_directory, "Migrations.sol"), path.join(dep1Root, "contracts", "Migrations.sol"))
    fs.copySync(path.join(__dirname, "2_deploy_extralib.js.template"), path.join(dep1Root, "migrations", "2_deploy_extralib.js"));
    fs.copySync(path.join(__dirname, "3_deploy_extralibx.js.template"), path.join(dep1Root, "migrations", "3_deploy_extralibx.js"));
    fs.copySync(path.join(__dirname, "dep-package.json"), path.join(dep1Root, "package.json"));
    fs.copySync(path.join(__dirname, "dep-truffle.js.template"), path.join(dep1Root, "truffle.js"));

    var dep2Root = path.join(config.working_directory, "node_modules", "dep2")
    fs.copySync(path.join(__dirname, "extralib2.sol"), path.join(dep2Root, "contracts", "extralib2.sol"));
    fs.copySync(path.join(__dirname, "extraotherlib2.sol"), path.join(dep2Root, "contracts", "extraotherlib2.sol"));
    fs.copySync(path.join(config.migrations_directory, "1_initial_migration.js"), path.join(dep2Root, "migrations", "1_initial_migration.js"));
    fs.copySync(path.join(config.contracts_directory, "Migrations.sol"), path.join(dep2Root, "contracts", "Migrations.sol"))
    fs.copySync(path.join(__dirname, "2_deploy_extralib2.js.template"), path.join(dep2Root, "migrations", "2_deploy_extralib2.js"));
    fs.copySync(path.join(__dirname, "3_deploy_extraotherlib2.js.template"), path.join(dep2Root, "migrations", "3_deploy_extraotherlib2.js"));
    fs.copySync(path.join(__dirname, "dep2-package.json"), path.join(dep2Root, "package.json"));
    fs.copySync(path.join(__dirname, "dep2-truffle-config.js.template"), path.join(dep2Root, "truffle-config.js"));
  });

  it("will compile", function(done) {
    this.timeout(20000);

    CommandRunner.run("compile", config, function(err) {
      var output = logger.contents();
      if (err) {
        console.log(output);
        return done(err);
      }

      assert(fs.existsSync(path.join(config.contracts_build_directory, "Contract.json")));
      assert(fs.existsSync(path.join(config.contracts_build_directory, "Migrations.json")));

      done();
    });
  });

  it.skip("will do a dry run migration", function(done) {
    // this should work but I think something gets mutated in this test
    // causing the later non-dry-run migration test to fail
    this.timeout(20000);

    CommandRunner.run("migrate --dry-run", config, function(err) {
      var output = logger.contents();
      if (err) {
        console.log(output);
        return done(err);
      }

      var Contract = contract(require(path.join(config.contracts_build_directory, "Contract.json")));
      var ExtraLibrary = contract(require(path.join(config.working_directory, "node_modules", "@org", "pkg", "build", "contracts", "ExtraLibrary.json")));
      var Migrations = contract(require(path.join(config.contracts_build_directory, "Migrations.json")));

      var promises = [];

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

      if (err) {
        console.log(output);
        return done(err);
      }

      done();
    });
  });

  it("will migrate", function(done) {
    this.timeout(20000);

    CommandRunner.run("migrate", config, function(err) {
      var output = logger.contents();
      if (err) {
        console.log(output);
        return done(err);
      }

      var Contract3 = contract(require(path.join(config.contracts_build_directory, "Contract3.json")));
      var ExtraLibrary = contract(require(path.join(config.working_directory, "node_modules", "@org", "pkg", "build", "contracts", "ExtraLibrary.json")));
      var Migrations = contract(require(path.join(config.contracts_build_directory, "Migrations.json")));

      var promises = [];

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
