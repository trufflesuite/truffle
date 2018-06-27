var Box = require("truffle-box");
var MemoryLogger = require("../memorylogger");
var CommandRunner = require("../commandrunner");
var contract = require("truffle-contract");
var fs = require("fs-extra");
var path = require("path");
var assert = require("assert");
var Server = require("../server");
var Reporter = require("../reporter");

describe("Contract names", function() {
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
  });

  it("will compile if file names do not match contract names", function(done) {
    this.timeout(40000);

    CommandRunner.run("compile", config, function(err) {
      if (err) return done(err);

      // The contract's name is Contract, but the file name is contract.
      // Not only should we not receive an error, but we should receive contract
      // artifacts relative to the contract name and not the file name.
      assert(fs.existsSync(path.join(config.contracts_build_directory, "Contract.json")));

      done();
    });
  });

  it("will migrate when artifacts.require() doesn't have an extension and names do not match", function(done) {
    this.timeout(20000);

    CommandRunner.run("migrate", config, function(err) {
      if (err) return done(err);

      var Contract = contract(require(path.join(config.contracts_build_directory, "Contract.json")));
      Contract.setProvider(config.provider);

      var deployed;
      Contract.deployed().then(function(instance) {
        deployed = instance;
        assert.notEqual(instance.address, null, instance.contract_name + " didn't have an address!")
      }).then(function() {
        // Now let's interact with our deployed contract JUST to ensure it actually did do
        // the right thing.
        return deployed.specialValue.call();
      }).then(function(value) {
        assert.equal(value, 1337, "Somehow the wrong contract was deployed, because we don't have the correct value");
        done();
      }).catch(done);
    });
  });

  it("will compile and migrate with relative imports (using filename)", function(done) {
    this.timeout(30000);

    fs.copySync(path.join(__dirname, "relative_import.sol"), path.join(config.contracts_directory, "relative_import.sol"));
    fs.copySync(path.join(__dirname, "3_deploy_relative_import.js.template"), path.join(config.migrations_directory, "3_deploy_relative_import.js"));

    CommandRunner.run("compile", config, function(err) {
      if (err) return done(err);

      assert(fs.existsSync(path.join(config.contracts_build_directory, "RelativeImport.json")));

      CommandRunner.run("migrate", config, function(err) {
        if (err) return done(err);

        var RelativeImport = contract(require(path.join(config.contracts_build_directory, "RelativeImport.json")));
        RelativeImport.setProvider(config.provider);

        var deployed;
        RelativeImport.deployed().then(function(instance) {
          deployed = instance;
          assert.notEqual(instance.address, null, instance.contract_name + " didn't have an address!")
        }).then(function() {
          // Now let's interact with our deployed contract JUST to ensure it actually did do
          // the right thing.
          return deployed.specialValue.call();
        }).then(function(value) {
          assert.equal(value, 1337, "Somehow the wrong contract was deployed, because we don't have the correct value");
          done();
        }).catch(done);
      });
    });
  });

  // it("will compile and migrate with floating imports (using filename)", function(done) {
  //   this.timeout(20000);
  //
  //   fs.copySync(path.join(__dirname, "floating_import.sol"), path.join(config.contracts_directory, "floating_import.sol"));
  //   fs.copySync(path.join(__dirname, "4_deploy_floating_import.js"), path.join(config.migrations_directory, "4_deploy_floating_import.js"));
  //
  //   CommandRunner.run("compile", config, function(err) {
  //     if (err) return done(err);
  //
  //     assert(fs.existsSync(path.join(config.contracts_build_directory, "FloatingImport.json")));
  //
  //     CommandRunner.run("migrate", config, function(err) {
  //       if (err) return done(err);
  //
  //       var FloatingImport = contract(require(path.join(config.contracts_build_directory, "FloatingImport.json")));
  //       FloatingImport.setProvider(config.provider);
  //
  //       var deployed;
  //       FloatingImport.deployed().then(function(instance) {
  //         deployed = instance;
  //         assert.notEqual(instance.address, null, instance.contract_name + " didn't have an address!")
  //       }).then(function() {
  //         // Now let's interact with our deployed contract JUST to ensure it actually did do
  //         // the right thing.
  //         return deployed.specialValue.call();
  //       }).then(function(value) {
  //         assert.equal(value, 1337, "Somehow the wrong contract was deployed, because we don't have the correct value");
  //         done();
  //       }).catch(done);
  //     });
  //   });
  // });

  //
  // it("will run tests", function(done) {
  //   this.timeout(20000);
  //   CommandRunner.run("test", config, function(err) {
  //     if (err) return done(err);
  //
  //     assert(logger.contents().indexOf("5 passing") >= 0);
  //     done();
  //   });
  // });

});
