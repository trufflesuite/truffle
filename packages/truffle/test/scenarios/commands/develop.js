const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const path = require("path");
const assert = require("assert");
const sandbox = require("../sandbox");

const logger = new MemoryLogger();
let config, project, cleanupSandboxDir;

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
    ({ config, cleanupSandboxDir } = await sandbox.create(project));
    config.network = "development";
    config.logger = logger;
  });

  after(function () {
    cleanupSandboxDir();
  });

  describe("Globals", function () {
    const cunningWord = "contrafibularities";
    let output;

    before(async function () {
      this.timeout(10000);
      const inputs = [`dict = "${cunningWord}"`, "Object.keys(global)"];

      await CommandRunner.runInREPL({
        inputCommands: inputs,
        config,
        executableCommand: "develop",
        displayHost: "develop"
      });
      output = logger.contents();
    });

    it("Sends multiple commands to REPL", () => {
      assert(
        output.includes(cunningWord),
        "It seems the `runInREPL` does not handle multiple inputs!"
      );
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

  describe("Improper truffle commands", async function () {
    this.timeout(7000);

    [
      {
        cmd: "console",
        expectedError: `ℹ️ : 'console' is not allowed within Truffle REPL`
      },
      {
        cmd: "CONSOLE",
        expectedError: `ℹ️ : 'CONSOLE' is not allowed within Truffle REPL`
      },
      {
        cmd: "develop",
        expectedError: `ℹ️ : 'develop' is not allowed within Truffle REPL`
      },
      {
        cmd: "alakazam",
        expectedError: `ℹ️ : 'alakazam' is not a valid Truffle command`
      },
      {
        cmd: "",
        expectedError: `ℹ️ : Missing truffle command. Please include a valid truffle command.`
      }
    ].forEach(({ cmd, expectedError }) => {
      it(`alerts on 'truffle ${cmd}'`, async function () {
        await CommandRunner.runInREPL({
          inputCommands: [`truffle ${cmd}`],
          config,
          executableCommand: "develop",
          displayHost: "develop"
        });

        const output = logger.contents();
        assert(
          output.includes(expectedError),
          `Expected string in output: "${expectedError}"\n${formatLines(
            output
          )}`
        );
      });
    });
  });

  describe("Improper command options", async function () {
    this.timeout(7000);

    [
      {
        option: "--url",
        expectedError: `ℹ️ : url option is not supported within Truffle REPL`
      },
      {
        option: "--network",
        expectedError: `ℹ️ : network option is not supported within Truffle REPL`
      }
    ].forEach(({ option, expectedError }) => {
      it(`alerts on 'migrate ${option}'`, async function () {
        await CommandRunner.runInREPL({
          inputCommands: [`migrate ${option}`],
          config,
          executableCommand: "develop",
          displayHost: "develop"
        });

        const output = logger.contents();
        assert(
          output.includes(expectedError),
          `Expected string in output: "${expectedError}"\n${formatLines(
            output
          )}`
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

  it("returns values after assignments with await", async function () {
    this.timeout(70000);
    const input = "x = await Promise.resolve('This is an example of a string')";

    await CommandRunner.runInREPL({
      inputCommands: [input],
      config,
      executableCommand: "develop",
      displayHost: "develop"
    });

    const output = logger.contents();
    const expectedValue = "This is an example of a string";
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
