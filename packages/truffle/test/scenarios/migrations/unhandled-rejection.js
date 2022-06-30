const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const sandbox = require("../sandbox");

describe("unhandledRejection detection", function () {
  let config;
  const project = path.join(
    __dirname,
    "../../sources/migrations/unhandled-rejection"
  );
  const logger = new MemoryLogger();

  before(async function () {
    this.timeout(10000);
    await Server.start();
    config = await sandbox.create(project);
    config.network = "development";
    config.logger = logger;
  });
  after(async function () {
    await Server.stop();
  });

  it("should detect unhandled-rejection", async function () {
    this.timeout(70000);

    await CommandRunner.run("migrate", config);
    const output = logger.contents();
    assert(output.includes("UnhandledRejections detected"));
    assert(output.includes("Promise { <rejected> 4242 } 4242"));
  });
});
