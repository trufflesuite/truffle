const sandbox = require("../sandbox");
const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const path = require("path");
const { assert } = require("chai");
const Server = require("../server");

describe("truffle test", function () {
  let config, cleanupSandboxDir;
  const logger = new MemoryLogger();
  const project = path.join(__dirname, "../../sources/toyProject");

  before(async () => {
    await Server.start();
    ({ cleanupSandboxDir, config } = await sandbox.create(project));
    config.logger = logger;
  });
  after(async function () {
    await Server.stop();
    cleanupSandboxDir();
  });

  it("runs tests", async function () {
    this.timeout(70000);
    await CommandRunner.run("test", config);
    const output = logger.contents();
    assert(output.includes("1 passing"));
  });
});
