const { default: Box } = require("@truffle/box");
const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const contract = require("@truffle/contract");
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const Reporter = require("../reporter");

describe("Happy path (truffle unbox)", function () {
  let config;
  let options;
  const logger = new MemoryLogger();

  before(async function () {
    await Server.start();
  });
  after(async function () {
    await Server.stop();
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

  it("compiles", async function () {
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

  it("migrates", async function () {
    this.timeout(50000);

    await CommandRunner.run("migrate", config);

    const MetaCoin = contract(
      require(path.join(config.contracts_build_directory, "MetaCoin.json"))
    );
    const ConvertLib = contract(
      require(path.join(config.contracts_build_directory, "ConvertLib.json"))
    );
    const Migrations = contract(
      require(path.join(config.contracts_build_directory, "Migrations.json"))
    );

    const promises = [];

    [MetaCoin, ConvertLib, Migrations].forEach(function (abstraction) {
      abstraction.setProvider(config.provider);

      promises.push(
        abstraction.deployed().then(function (instance) {
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

  it("runs tests", async function () {
    this.timeout(70000);
    await CommandRunner.run("test", config);
    const output = logger.contents();

    assert(output.indexOf("5 passing") >= 0);
  });
});
