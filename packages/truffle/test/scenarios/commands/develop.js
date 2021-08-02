const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const path = require("path");
const assert = require("assert");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");

const logger = new MemoryLogger();
let config, project;


describe("truffle develop", function () {
  project = path.join(
    __dirname,
    "../../sources/develop",
  );

  before(async function () {
    this.timeout(10000);
    config = await sandbox.create(project);
    config.network = "development";
    config.logger = logger;
    config.mocha = {
      reporter: new Reporter(logger),
    };
  });

  it("loads snippets", async function () {
    this.timeout(70000);

    await CommandRunner.runInDevelopEnvironment(["breakfast"], config);
    const output = logger.contents();

    //prepare a helpful message to standout in CI log noise
    const formatLines = (lines) =>
      lines.split("\n").map((line) => `\t---truffle develop log---\t${line}`)
        .join("\n");
    const expectedValue = "eggs and sausage, and a side of toast";
    assert(
      output.includes(expectedValue),
      `Expected "${expectedValue}" in output:\n${formatLines(output)}`,
    );
  });

  it("loads snippets which have access to Truffle variables", async function () {
    this.timeout(70000);

    await CommandRunner.runInDevelopEnvironment(["twoAccounts"], config);
    const output = logger.contents();

    //prepare a helpful message to standout in CI log noise
    const formatLines = (lines) =>
      lines.split("\n").map((line) => `\t---truffle develop log---\t${line}`)
        .join("\n");
    // `twoAccounts` is the concatenation of the first 2 accounts in `accounts`
    const expectedValue = "0x8d9606F90B6CA5D856A9f0867a82a645e2DfFf370x370566028c7EAbDA8E408dA77A99EAf1e73DdC60";
    assert(
      output.includes(expectedValue),
      `Expected "${expectedValue}" in output:\n${formatLines(output)}`,
    );
  });
});
