const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const sandbox = require("../sandbox");

describe("Javascript testing", function () {
  let config, cleanupCallback;
  const project = path.join(__dirname, "../../sources/javascript_testing");
  const logger = new MemoryLogger();

  before(async function () {
    this.timeout(10000);
    ({ config, cleanupCallback } = await sandbox.create(project));
    config.network = "development";
    config.logger = logger;
    await Server.start();
  });
  after(async function () {
    await Server.stop();
    cleanupCallback();
  });

  it("allows use of isAddress", async function () {
    this.timeout(120000);

    await CommandRunner.run("test", config);
    const output = logger.contents();
    assert(output.includes("1 passing"));
  });
});
