const assert = require("assert");
const CommandRunner = require("../commandRunner");
const MemoryLogger = require("../MemoryLogger");
let config = {};

describe("truffle help [ @standalone ]", function () {
  const logger = new MemoryLogger();
  beforeEach("set up config for logger", function () {
    config.logger = logger;
  });

  describe("when run without arguments", function () {
    it("displays general help", async function () {
      this.timeout(10000);
      await CommandRunner.run("help", config);
      const output = logger.contents();
      assert(output.includes("Usage: truffle <command> [options]"));
    });
  });

  describe("when run with an argument", function () {
    it("tells the user if it doesn't recognize the given command", async () => {
      await CommandRunner.run("help eggplant", config);
      const output = logger.contents();
      assert(output.includes("Cannot find the given command 'eggplant'"));
    }).timeout(20000);

    it("displays help for the given command when valid", async function () {
      await CommandRunner.run("help compile", config);
      const output = logger.contents();
      assert(output.includes("Description:  Compile contract source files"));
    }).timeout(20000);

    it("displays help for the given command with help function [ @>=12 ]", async function () {
      this.timeout(10000);
      await CommandRunner.run("help preserve", config);
      const output = logger.contents();
      assert(
        output.includes(
          "Description:  Save data to decentralized storage platforms like IPFS and Filecoin"
        )
      );
      assert(output.includes("--environment"));
    });

    it("displays help for given command when `--help` is at the end of the command line", async function () {
      await CommandRunner.run("compile --help", config);
      const output = logger.contents();
      assert(output.includes("Description:  Compile contract source files"));
    }).timeout(20000);

    it("displays help for given command when `help` is at the end of the command line", async function () {
      await CommandRunner.run("compile help", config);
      const output = logger.contents();
      assert(output.includes("Description:  Compile contract source files"));
    }).timeout(20000);

    it("displays help for given command when `--help` is right before the truffle command", async function () {
      await CommandRunner.run("help compile", config);
      const output = logger.contents();
      assert(output.includes("Description:  Compile contract source files"));
    }).timeout(20000);

    it("displays help for the `help` command", async function () {
      await CommandRunner.run("help help", config);
      const output = logger.contents();
      assert(
        output.includes(
          " Description:  List all commands or provide information about a specific command"
        )
      );
    }).timeout(20000);

    it("errors when <subCommand> is not valid", async function () {
      await CommandRunner.run("help compile boo", config);
      const output = logger.contents();
      assert(output.includes("WARNING: compile does not have sub commands"));
    }).timeout(20000);

    it("errors with correct `help` usage info when `truffle <cmd> --help <subCommand>` is used", async function () {
      await CommandRunner.run("db --help serve", config);
      const output = logger.contents();
      assert(
        output.includes(
          "Error: please use the following syntax for accessing help information"
        )
      );
    }).timeout(20000);

    it("errors with correct `help` usage info when `truffle <cmd> help <subCommand>` is used", async function () {
      await CommandRunner.run("db help serve", config);
      const output = logger.contents();
      assert(
        output.includes(
          "Error: please use the following syntax for accessing help information"
        )
      );
    }).timeout(20000);
  });
});
