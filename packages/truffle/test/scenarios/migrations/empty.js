const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");

describe("migrate (empty)", function () {
  let config;
  const project = path.join(__dirname, "../../sources/migrations/empty");
  const logger = new MemoryLogger();

  before(done => Server.start(done));
  after(done => Server.stop(done));

  before(async function () {
    this.timeout(10000);
    config = await sandbox.create(project);
    config.network = "development";
    config.logger = logger;
    config.mocha = {
      reporter: new Reporter(logger)
    };
  });

  it("indicates no ETH was spent on migration", async function () {
    this.timeout(70000);

    await CommandRunner.run("migrate", config);
    const output = logger.contents();

    console.log(output);
    assert(output.includes("1_initial_migration.js"));
    assert(output.match(/Total cost:\s+0 ETH/));
    assert(output.match(/Final cost:\s+0 ETH/));
  });
});
