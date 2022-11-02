const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const sandbox = require("../sandbox");

describe("migrate (empty)", function () {
  let config, cleanupSandboxDir;
  const project = path.join(
    __dirname,
    "../../sources/migrations/deferred-chain"
  );
  const logger = new MemoryLogger();

  before(async function () {
    this.timeout(10000);
    await Server.start();
    ({ config, cleanupSandboxDir } = await sandbox.create(project));
    config.network = "development";
    config.logger = logger;
  });
  after(async function () {
    await Server.stop();
    cleanupSandboxDir();
  });

  it("Correctly handles control flow on rejection in deployment", async function () {
    this.timeout(70000);

    try {
      //the migration fails due to
      //https://github.com/trufflesuite/truffle/issues/5225
      //so we have to put it in a try
      await CommandRunner.run("migrate", config);
    } catch {
      //do nothing
    }
    const output = logger.contents();

    console.log(output);
    assert(output.includes("Error in migration:"));
    assert(!output.includes("succeeded"));
  });
});
