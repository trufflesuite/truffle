const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");

describe("unhandledRejection detection", function () {
  let config;
  const project = path.join(
    __dirname,
    "../../sources/migrations/unhandled-rejection"
  );
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

  it("should detect unhandled-rejection", async function () {
    this.timeout(70000);

    await CommandRunner.run("migrate", config);
    const output = logger.contents();
    assert(output.includes("UnhandledRejections detected"));
    assert(output.includes("Promise { <rejected> 4242 } 4242"));
  });
});
