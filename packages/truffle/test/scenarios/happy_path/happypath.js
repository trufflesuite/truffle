const sandbox = require("../sandbox");
const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const contract = require("@truffle/contract");
const fs = require("fs");
const path = require("path");
const { assert } = require("chai");
const Server = require("../server");

describe("basic commands on a fresh project", function () {
  let config;
  const logger = new MemoryLogger();
  const project = path.join(__dirname, "../../sources/toyProject");

  before(async () => {
    await Server.start();
    config = await sandbox.create(project);
    config.network = "development";
    config.logger = logger;
  });
  after(async function () {
    await Server.stop();
  });

  it("compiles", async function () {
    this.timeout(20000);
    await CommandRunner.run("compile", config);
    assert(
      fs.existsSync(
        path.join(config.contracts_build_directory, "Migrations.json")
      )
    );
  });

  it("migrates", async function () {
    this.timeout(50000);
    await CommandRunner.run("migrate", config);
    const Migrations = contract(
      require(path.join(config.contracts_build_directory, "Migrations.json"))
    );
    Migrations.setProvider(config.provider);

    const instance = await Migrations.deployed();
    assert.isNotNull(instance.address);
  });

  it("runs tests", async function () {
    this.timeout(70000);
    await CommandRunner.run("test", config);
    const output = logger.contents();
    assert(output.indexOf("0 passing") >= 0);
  });
});
