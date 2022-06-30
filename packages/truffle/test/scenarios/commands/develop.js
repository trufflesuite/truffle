const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const path = require("path");
const assert = require("assert");
const sandbox = require("../sandbox");

const logger = new MemoryLogger();
let config, project;

//prepare a helpful message to standout in CI log noise
const formatLines = lines =>
  lines
    .split("\n")
    .map(line => `\t---truffle develop log---\t${line}`)
    .join("\n");

describe("truffle develop", function () {
  project = path.join(__dirname, "../../sources/develop");

  before(async function () {
    this.timeout(10000);
    config = await sandbox.create(project);
    config.network = "development";
    config.logger = logger;
  });

  describe("Globals", function () {
    let output;
    before(async function () {
      this.timeout(10000);
      const input = "Object.keys(global)";

      await CommandRunner.runInREPL({
        inputCommands: [input],
        config,
        executableCommand: "develop",
        displayHost: "develop"
      });
      output = logger.contents();
    });

    [
      "clearInterval",
      "clearTimeout",
      "setInterval",
      "setTimeout",
      "clearImmediate",
      "setImmediate",
      "__core-js_shared__",
      "regeneratorRuntime"
    ].forEach(property => {
      it(`has ${property}`, function () {
        this.timeout(70000);
        assert(
          output.includes(property),
          `${property} is missing from globals.\n${formatLines(output)}`
        );
      });
    });
  });

  it("handles awaits", async function () {
    this.timeout(70000);
    const input = "await Promise.resolve(`${6*7} is probably not a prime`)";

    await CommandRunner.runInREPL({
      inputCommands: [input],
      config,
      executableCommand: "develop",
      displayHost: "develop"
    });

    const output = logger.contents();
    const expectedValue = "42 is probably not a prime";
    assert(
      output.includes(expectedValue),
      `Expected "${expectedValue}" in output:\n${formatLines(output)}`
    );
  });

  it("loads snippets", async function () {
    this.timeout(70000);

    await CommandRunner.runInREPL({
      inputCommands: ["breakfast"],
      config,
      executableCommand: "develop",
      displayHost: "develop"
    });

    const output = logger.contents();
    const expectedValue = "eggs and sausage, and a side of toast";
    assert(
      output.includes(expectedValue),
      `Expected "${expectedValue}" in output:\n${formatLines(output)}`
    );
  });

  it("loads snippets which have access to Truffle variables", async function () {
    this.timeout(70000);

    await CommandRunner.runInREPL({
      inputCommands: ["twoAccounts"],
      config,
      executableCommand: "develop",
      displayHost: "develop"
    });
    const output = logger.contents();

    // `twoAccounts` is the concatenation of the first 2 accounts in `accounts`
    // this matches two concatenated accounts
    const addressesRegex = new RegExp(/(0x[0-9a-f]{40}){2}/, "gi");
    assert(
      addressesRegex.test(output),
      `Expected value in output:\n${formatLines(output)}`
    );
  });
});
