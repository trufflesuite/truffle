const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const path = require("path");
const assert = require("assert");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");

const logger = new MemoryLogger();
let config, project;

describe("truffle develop", function () {
  project = path.join(__dirname, "../../sources/develop");

  before(async function () {
    this.timeout(10000);
    config = await sandbox.create(project);
    config.network = "development";
    config.logger = logger;
    config.mocha = {
      reporter: new Reporter(logger)
    };
  });

  it("loads snippets", async function () {
    this.timeout(70000);

    await CommandRunner.runInDevelopEnvironment(["breakfast"], config);
    const output = logger.contents();

    //prepare a helpful message to standout in CI log noise
    const formatLines = lines =>
      lines
        .split("\n")
        .map(line => `\t---truffle develop log---\t${line}`)
        .join("\n");
    const expectedValue = "eggs and sausage, and a side of toast";
    assert(
      output.includes(expectedValue),
      `Expected "${expectedValue}" in output:\n${formatLines(output)}`
    );
  });

  it("loads snippets which have access to Truffle variables", async function () {
    this.timeout(70000);

    await CommandRunner.runInDevelopEnvironment(["twoAccounts"], config);
    const output = logger.contents();

    //prepare a helpful message to standout in CI log noise
    const formatLines = lines =>
      lines
        .split("\n")
        .map(line => `\t---truffle develop log---\t${line}`)
        .join("\n");
    // `twoAccounts` is the concatenation of the first 2 accounts in `accounts`
    // this matches two concatenated accounts
    const addressesRegex = new RegExp(/(0x[0-9a-f]{40}){2}/, "gi");
    assert(
      addressesRegex.test(output),
      `Expected value in output:\n${formatLines(output)}`
    );
  });
});
