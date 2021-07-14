const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const path = require("path");
const assert = require("assert");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");

describe("develop", function () {
  let config;
  const project = path.join(
    __dirname,
    "../../sources/develop",
  );
  const logger = new MemoryLogger();

  before(async function () {
    this.timeout(10000);
    config = await sandbox.create(project);
    config.network = "development";
    config.logger = logger;
    config.mocha = {
      reporter: new Reporter(logger),
    };
  });

  it("should load snippets", async function () {
    this.timeout(70000);

    await CommandRunner.run("develop", config);
    const output = logger.contents();

    //prepare a helpful message to standout in CI log noise
    const formatLines = (lines) =>
      lines.split("\n").map((line) => `\t---truffle develop log---\t${line}`)
        .join("\n");
    const successMessage = "Snippet Loaded";
    assert(
      output.includes(successMessage),
      `Expected "${successMessage}" in output:\n${formatLines(output)}`,
    );
  });
});
