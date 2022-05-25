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
      const url = "http://localhost:8545";
      const parsedUrl = new URL(url);
      const displayHost = parsedUrl.host;

      await CommandRunner.runInREPL({
        config: config,
        replType: `console --url ${url}`,
        displayHost: displayHost
      });

      const output = logger.contents();
      const expectedValue = `truffle(${displayHost})>`;
      assert(
        output.includes(expectedValue),
        `Expected "${expectedValue}" in output`
      );
    }).timeout(90000);
  });
});
