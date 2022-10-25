const sandbox = require("../sandbox");
const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const path = require("path");
const { assert } = require("chai");
const Server = require("../server");

describe("truffle test", function () {
  let config, cleanupCallback;
  const logger = new MemoryLogger();
  const project = path.join(__dirname, "../../sources/toyProject");

  before(async () => {
    await Server.start();
    ({ cleanupCallback, config } = await sandbox.create(project));
    config.logger = logger;
  });
  after(async function () {
    await Server.stop();
    cleanupCallback();
  });

  it("runs tests", async function () {
    this.timeout(70000);
    await CommandRunner.run("test", config);
    const output = logger.contents();
    assert(output.includes("1 passing"));
  });
});
