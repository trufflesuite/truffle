const sandbox = require("../sandbox");
const CommandRunner = require("../commandRunner");
const fs = require("fs");
const path = require("path");
const { assert } = require("chai");
const Server = require("../server");

describe("truffle compile", function () {
  let config;
  const project = path.join(__dirname, "../../sources/toyProject");

  before(async () => {
    await Server.start();
    config = await sandbox.create(project);
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
});
