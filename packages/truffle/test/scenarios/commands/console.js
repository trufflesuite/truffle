const CommandRunner = require("../commandRunner");
const Server = require("../server");
const MemoryLogger = require("../MemoryLogger");
const assert = require("assert");
const path = require("path");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");

describe("truffle console", () => {
  let config, project;
  const logger = new MemoryLogger();

  before(async () => await Server.start());
  after(async () => await Server.stop());

  project = path.join(__dirname, "../../sources/console");

  before(async function () {
    this.timeout(10000);
    config = await sandbox.create(project);
    config.network = "development";
    config.logger = logger;
    config.mocha = {
      reporter: new Reporter(logger)
    };
  });

  describe("when run with options", () => {
    it("displays the url hostname in the prompt", async () => {
      const url = "http://localhost:8545";
      const parsedUrl = new URL(url);
      const displayHost = parsedUrl.host;

      await CommandRunner.runInREPL({
        inputCommands: [],
        config,
        executableCommand: "console",
        executableArgs: `--url ${url}`,
        displayHost
      });

      const output = logger.contents();
      const expectedValue = `truffle(${displayHost})>`;
      assert(
        output.includes(expectedValue),
        `Expected "${expectedValue}" in output`
      );
    }).timeout(90000);

    it("displays the network name in the prompt", async () => {
      const networkName = config.network;
      await CommandRunner.runInREPL({
        inputCommands: [],
        config,
        executableCommand: "console",
        executableArgs: `--network ${networkName}`,
        displayHost: networkName
      });

      const output = logger.contents();
      const expectedValue = `truffle(${networkName})>`;
      assert(
        output.includes(expectedValue),
        `Expected "${expectedValue}" in output`
      );
    }).timeout(90000);
  });
});
