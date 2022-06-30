const { default: Box } = require("@truffle/box");
const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const assert = require("assert");
const Server = require("../server");

describe("Typescript Tests", () => {
  const logger = new MemoryLogger();
  let config;
  let options;

  before(async function () {
    options = { name: "default#typescript", force: true };
    config = await Box.sandbox(options);
    config.logger = logger;
    config.network = "development";
    await Server.start();
  });
  after(async function () {
    await Server.stop();
  });

  describe("testing contract behavior", () => {
    it("runs .ts tests and have the correct behavior", async () => {
      try {
        await CommandRunner.run("test test/metacoin.ts", config);
        const output = logger.contents();
        assert(output.includes("3 passing"));
      } catch (error) {
        console.log(`there was an error -- %o`, error);
        console.log(`the logger contents are -- ${logger.contents()}`);
        assert.fail();
      }
    }).timeout(70000);

    it("detects and runs .sol, .ts, & .js test files", async () => {
      try {
        await CommandRunner.run("test", config);
        const output = logger.contents();
        assert(output.includes("8 passing"));
      } catch (error) {
        console.log(`there was an error -- %o`, error);
        console.log(`the logger contents are -- ${logger.contents()}`);
        assert.fail();
      }
    }).timeout(70000);
  });
}).timeout(10000);
