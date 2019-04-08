const Box = require("truffle-box");
const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const contract = require("truffle-contract");
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const Reporter = require("../reporter");

describe("Happy path (truffle unbox)", function() {
  let config;
  let options;
  const logger = new MemoryLogger();

  before("set up the server", function(done) {
    Server.start(done);
  });

  after("stop server", function(done) {
    Server.stop(done);
  });

  before("set up sandbox", function(done) {
    this.timeout(10000);
    options = { name: "default", force: true };
    Box.sandbox(options, function(err, conf) {
      if (err) return done(err);
      config = conf;
      config.network = "development";
      config.logger = logger;
      config.mocha = {
        reporter: new Reporter(logger)
      };
      done();
    });
  });

  it("will compile", function(done) {
    this.timeout(20000);

    CommandRunner.run("compile", config, function(err) {
      var output = logger.contents();
      if (err) {
        console.log(output);
        return done(err);
      }

      assert(
        fs.existsSync(
          path.join(config.contracts_build_directory, "MetaCoin.json")
        )
      );
      assert(
        fs.existsSync(
          path.join(config.contracts_build_directory, "ConvertLib.json")
        )
      );
      assert(
        fs.existsSync(
          path.join(config.contracts_build_directory, "Migrations.json")
        )
      );

      done();
    });
  });

  it("will migrate", function(done) {
    this.timeout(50000);

    CommandRunner.run("migrate", config, function(err) {
      var output = logger.contents();
      if (err) {
        console.log(output);
        return done(err);
      }

      var MetaCoin = contract(
        require(path.join(config.contracts_build_directory, "MetaCoin.json"))
      );
      var ConvertLib = contract(
        require(path.join(config.contracts_build_directory, "ConvertLib.json"))
      );
      var Migrations = contract(
        require(path.join(config.contracts_build_directory, "Migrations.json"))
      );

      var promises = [];

      [MetaCoin, ConvertLib, Migrations].forEach(function(abstraction) {
        abstraction.setProvider(config.provider);

        promises.push(
          abstraction.deployed().then(function(instance) {
            assert.notEqual(
              instance.address,
              null,
              instance.contract_name + " didn't have an address!"
            );
          })
        );
      });

      Promise.all(promises)
        .then(function() {
          done();
        })
        .catch(done);
    });
  });

  it("will run tests", function(done) {
    this.timeout(70000);
    CommandRunner.run("test", config, function(err) {
      var output = logger.contents();
      if (err) {
        console.log(output);
        return done(err);
      }

      assert(output.indexOf("5 passing") >= 0);
      done();
    });
  });
});
