const Box = require("@truffle/box");
const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const contract = require("@truffle/contract");
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

  before("set up sandbox", async () => {
    options = { name: "default", force: true };
    config = await Box.sandbox(options);
    config.network = "development";
    config.logger = logger;
    config.mocha = {
      reporter: new Reporter(logger)
    };
  });

  it("will compile", async function() {
    this.timeout(20000);

    await CommandRunner.run("compile", config);

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
  });

  it("will migrate", async function() {
    this.timeout(50000);

    await CommandRunner.run("migrate", config);

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
    await Promise.all(promises);
  });

  it("will run tests", async function() {
    this.timeout(70000);
    await CommandRunner.run("test", config);
    var output = logger.contents();

    assert(output.indexOf("5 passing") >= 0);
  });
});
