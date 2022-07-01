const sandbox = require("../sandbox");
const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
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

  it("runs tests", async function () {
    this.timeout(70000);
    await CommandRunner.run("test", config);
    const output = logger.contents();
    assert(output.indexOf("0 passing") >= 0);
  });
});
