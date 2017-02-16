var Init = require("truffle-init");
var MemoryLogger = require("../memorylogger");
var CommandRunner = require("../commandrunner");
var contract = require("truffle-contract");
var fs = require("fs");
var path = require("path");
var assert = require("assert");
var TestRPC = require("ethereumjs-testrpc");
var Reporter = require("../reporter");

describe("Happy path (truffle init)", function() {
  var config;
  var logger = new MemoryLogger();

  before("set up sandbox", function(done) {
    this.timeout(10000);
    Init.sandbox("default", function(err, conf) {
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

  it("will compile", function(done) {
    this.timeout(20000);

    CommandRunner.run("compile", config, function(err) {
      if (err) return done(err);

      assert(fs.existsSync(path.join(config.contracts_build_directory, "MetaCoin.json")));
      assert(fs.existsSync(path.join(config.contracts_build_directory, "ConvertLib.json")));
      assert(fs.existsSync(path.join(config.contracts_build_directory, "Migrations.json")));

      done();
    });
  });

  it("will migrate", function(done) {
    this.timeout(20000);

    CommandRunner.run("migrate", config, function(err) {
      if (err) return done(err);

      var MetaCoin = contract(require(path.join(config.contracts_build_directory, "MetaCoin.json")));
      var ConvertLib = contract(require(path.join(config.contracts_build_directory, "ConvertLib.json")));
      var Migrations = contract(require(path.join(config.contracts_build_directory, "Migrations.json")));

      var promises = [];

      [MetaCoin, ConvertLib, Migrations].forEach(function(abstraction) {
        abstraction.setProvider(config.networks.development.provider);

        promises.push(abstraction.deployed().then(function(instance) {
          assert.notEqual(instance.address, null, instance.contract_name + " didn't have an address!")
        }));
      });

      Promise.all(promises).then(function() {
        done();
      }).catch(done);
    });
  });

  it("will run tests", function(done) {
    this.timeout(20000);
    CommandRunner.run("test", config, function(err) {
      if (err) return done(err);

      assert(logger.contents().indexOf("5 passing") >= 0);
      done();
    });
  });

});
