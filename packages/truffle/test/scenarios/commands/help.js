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
      assert(output.includes("--ipfs"));
    });
  });
});
