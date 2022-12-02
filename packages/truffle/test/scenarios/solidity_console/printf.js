const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const fs = require("fs-extra");
const path = require("path");
const assert = require("assert");
const Ganache = require("ganache");
const sandbox = require("../sandbox");
const MemDown = require("memdown");

//prepare a helpful message to standout in CI log noise
const formatLines = lines =>
  lines
    .split("\n")
    .map(line => `\t---truffle develop log---\t${line}`)
    .join("\n");

const copyFixtures = config => {
  fs.copySync(
    path.join(__dirname, "Printf.sol"),
    path.join(config.contracts_directory, "Printf.sol")
  );
};

describe("Solidity console log [ @standalone ]", function () {
  this.timeout(30000);

  let config, logger, output, provider;
  let cleanupSandboxDir;
  let tempDirPath; // to manipulate truffle-config.js on fs.

  before("set up sandbox", async () => {
    ({ config, cleanupSandboxDir, tempDirPath } = await sandbox.create(
      path.join(__dirname, "../../sources/init")
    ));

    provider = Ganache.provider({
      miner: { instamine: "eager" },
      gasLimit: config.gasLimit,
      database: { db: new MemDown() }
    });

    logger = new MemoryLogger();
    config.logger = logger;
    config.networks = { development: { provider } };

    copyFixtures(config);
  });

  after(async () => {
    await cleanupSandboxDir();
  });

  describe("Logging", async function () {
    before("setup: interact with contract", async function () {
      const input = [
        "compile",
        "p = await Printf.new({value: 0x11235})",
        "`Contract address is: ${p.address}`",

        "await p.log_string()",
        "await p.log_unicode()",
        "await p.log_address_s()",
        "await p.log_address_o()",
        "await p.log_multiline_carriageReturn()",
        "await p.log_multiline_lineFeed()"
      ];

      await CommandRunner.runInREPL({
        inputCommands: input,
        config,
        executableCommand: "develop",
        displayHost: "develop"
      });

      output = logger.contents().replace(/\x1b\[[0-9;]*m/g, ""); // strip terminal control codes
    });

    after(async () => {
      provider && (await provider.disconnect());
    });

    it("logs string", function () {
      let expectedValue = ":  String! I am not a twine!";

      assert(
        output.includes(expectedValue),
        `Expected: "${expectedValue}" in output:\n${formatLines(output)}`
      );
    });

    it("logs unicode", () => {
      let expectedValue = ":  This is unicode: ☮";
      assert(
        output.includes(expectedValue),
        `Expected: "${expectedValue}" in output:\n${formatLines(output)}`
      );
    });

    it("logs address as %o", () => {
      let expectedValue = ":  The address is: 0x...";
      let rex = /:  The address is: '0x[\da-f]{40}'/;
      assert(
        rex.test(output),
        `Expected: "${expectedValue}" in output:\n${formatLines(output)}`
      );
    });

    it("Logs address as %s", () => {
      let expectedValue = ":  The address is: 0x...";
      let rex = /:  The address is: 0x[\da-f]{40}/;
      assert(
        rex.test(output),
        `Expected: "${expectedValue}" in output:\n${formatLines(output)}`
      );
    });

    it("Logs multiline strings with carriage-return", () => {
      let rex = /:  The cr: line 1.       line 2.line 3/is;
      assert(
        rex.test(output),
        `Expected: a string with carriage return in output:\n${formatLines(
          output
        )}`
      );
    });

    it("Logs multiline strings with linefeed", () => {
      let rex1 = /:  The lf: line 1/;
      let rex2 = /:  line 2/;
      let rex3 = /:  line 3/;
      assert(
        rex1.test(output) && rex2.test(output) && rex3.test(output),
        `Expected: a string with linefeeds in output:\n${formatLines(output)}`
      );
    });
  });

  describe("Migration", async function () {
    this.timeout(30000);
    let server;
    let debugEnv = "";

    before("setup: interact with contract", async function () {
      server = Ganache.server({
        chain: { chainId: 1, networkId: 1 },
        miner: { instamine: "eager" },
        database: { db: new MemDown() },
        logging: { quiet: true }
      });
      await server.listen(7545);

      copyFixtures(config);
    });

    after(async () => {
      await server.close();
    });

    it("MAINNET preventConsoleLogMigration: false", async function () {
      try {
        logger = new MemoryLogger();
        config.logger = logger;
        // setup new config file
        await fs.copy(
          path.join(tempDirPath, "config-disable-migrate-false.js"),
          path.join(tempDirPath, "truffle-config.js")
        );
        await CommandRunner.run("migrate --network mainnet", config, debugEnv);
        assert(logger.includes("Total deployments:   1"));
      } catch (error) {
        console.log("ERROR: %o", error);
        assert.fail("Migration should have succeeded!");
      }
    });

    it("MAINNET preventConsoleLogMigration: true", async function () {
      try {
        logger = new MemoryLogger();
        config.logger = logger;
        // setup new config file
        await fs.copy(
          path.join(tempDirPath, "config-disable-migrate-true.js"),
          path.join(tempDirPath, "truffle-config.js")
        );
        await CommandRunner.run(
          "migrate --network mainnet --reset --skip-dry-run",
          config,
          debugEnv
        );
        assert.fail("Migration should have failed");
      } catch (error) {
        const output = logger.contents();
        const summary =
          /Solidity console.log detected in the following assets:.+Printf.json/ms;
        assert(
          summary.test(output),
          "Should list the contract using console.log"
        );
        const action1 =
          /You are trying to deploy contracts that use console.log./;

        assert(action1.test(output), "Should suggest action");

        const action2 =
          /Please fix, or disable this check by setting.+preventConsoleLogMigration to false/;
        assert(action2.test(output), "Should suggest action");
      }
    });
  });
});
