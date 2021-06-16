const { default: Box } = require("@truffle/box");
const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const assert = require("assert");
const Reporter = require("../reporter");
const Server = require("../server");

describe("Typescript Tests", () => {
  const logger = new MemoryLogger();
  let config;
  let options;

  before(done => Server.start(done));
  after(done => Server.stop(done));

  before("set up sandbox", async function () {
    options = { name: "default#typescript", force: true };
    config = await Box.sandbox(options);
    config.logger = logger;
    config.network = "development";
    config.mocha = {
      reporter: new Reporter(logger)
    };
  });

  describe("testing contract behavior", () => {
    it("will run .ts tests and have the correct behavior", async () => {
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

    it("will detect and run .sol, .ts, & .js test files", async () => {
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
