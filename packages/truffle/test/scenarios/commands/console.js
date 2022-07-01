const CommandRunner = require("../commandRunner");
const Server = require("../server");
const MemoryLogger = require("../MemoryLogger");
const assert = require("assert");
const path = require("path");
const sandbox = require("../sandbox");
const tmp = require("tmp");

describe("truffle console", () => {
  let config;
  const logger = new MemoryLogger();
  const project = path.join(__dirname, "../../sources/console");

  before(async () => {
    config = await sandbox.create(project);
    config.network = "development";
    config.logger = logger;
    await Server.start();
  });
  after(async () => await Server.stop());

  describe("when runs with network option with a config", () => {
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

  describe("when runs with url option", () => {
    const url = "http://localhost:8545";
    const parsedUrl = new URL(url);
    const displayHost = parsedUrl.host;
    describe("with a config", () => {
      it("displays the url hostname in the prompt", async () => {
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
    });

    describe("without a config", () => {
      let sandlot;
      before(() => {
        sandlot = tmp.dirSync({ unsafeCleanup: true });
        config = { working_directory: sandlot.name };
        config.logger = logger;
      });

      it("displays the url hostname in the prompt", async () => {
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
    });
  });
});
