const CommandRunner = require("../commandRunner");
const Server = require("../server");
const Config = require("@truffle/config");
const MemoryLogger = require("../MemoryLogger");
const assert = require("assert");

describe("truffle console", () => {
  let config;
  const logger = new MemoryLogger();

  before(async () => await Server.start());
  after(async () => await Server.stop());

  before("before all setup", () => {
    config = Config.default();
    config.logger = logger;
  });

  describe("when run with --url option", () => {
    it("displays the hostname in the prompt", async () => {
      await CommandRunner.runInConsoleEnvironment(
        "http://localhost:8545",
        config
      );
      const output = logger.contents();
      const expectedValue = "truffle(localhost:8545)>";
      assert(
        output.includes(expectedValue),
        `Expected "${expectedValue}" in output`
      );
    }).timeout(90000);
  });
});
