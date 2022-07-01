const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const sandbox = require("../sandbox");

describe("TestEvents and mixed sol/js testing", function () {
  let config;
  const project = path.join(__dirname, "../../sources/mixed_testing");
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

  it("will correctly decode events as appropriate", async function () {
    this.timeout(150000);

    try {
      //will fail, since we included a failing test
      await CommandRunner.run("test --show-events", config);
    } catch {
      //ignore the error
    }
    const output = logger.contents();
    //check number 1: did we avoid any warnings about undecodeable events?
    //(these will occur if we fail to filter out test events)
    assert(!output.includes("Warning"), "failed to filter out test event");
    //check number 2: did the second test fail?
    assert(
      output.includes("1) testShouldFail"),
      "failing Solidity test succeeded instead"
    );
    //check number 3: did we avoid ambiguous decodings in the JS test?
    //(here we are checking that the loosened decoding mode used in the Solidity tests
    //was properly turned off before proceeding to JS tests)
    assert(!output.includes("Ambiguous"), "disableChecks was not turned off");
  });
});
