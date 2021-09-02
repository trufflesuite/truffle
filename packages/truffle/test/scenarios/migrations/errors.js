const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");
const Web3 = require("web3");

describe("migration errors", function () {
  let config;
  let web3;
  let networkId;
  const project = path.join(__dirname, "../../sources/migrations/error");
  const logger = new MemoryLogger(true);

  before(done => Server.start(done));
  after(done => Server.stop(done));

  before(async function () {
    this.timeout(10000);
    config = await sandbox.create(project);
    config.network = "development";
    config.logger = logger;
    config.mocha = {
      reporter: new Reporter(logger)
    };

    const provider = new Web3.providers.HttpProvider("http://localhost:8545", {
      keepAlive: false
    });
    web3 = new Web3(provider);
    networkId = await web3.eth.net.getId();
  });

  it("should error and stop", async function () {
    this.timeout(70000);

    try {
      await CommandRunner.run("migrate", config);
      assert(false, "This should have errored.");
    } catch (error) {
      const output = logger.contents();
      console.log(output);

      assert(output.includes("2_migrations_revert.js"));
      assert(output.includes("Deploying 'Example'"));
      assert(output.includes("Deploying 'ExampleRevert'"));
      assert(output.includes("Error"));
      assert(
        output.includes("require or revert") ||
          output.includes("gas required exceeds")
      );
      assert(!output.includes("Deploying 'UsesExample'"));
      assert(!output.includes("3_migrations_ok.js"));

      const location = path.join(
        config.contracts_build_directory,
        "UsesExample.json"
      );
      const artifact = require(location);
      const network = artifact.networks[networkId];
      assert(network === undefined);
    }
  });

  it("should run from the last successfully completely migration", async function () {
    this.timeout(70000);

    try {
      await CommandRunner.run("migrate", config);
      assert(false, "This should have gone to the catch.");
    } catch (_error) {
      const output = logger.contents();
      console.log(output);

      assert(!output.includes("1_initial_migration.js"));
      assert(output.includes("2_migrations_revert.js"));
    }
  });

  it("should run out of gas correctly", async function () {
    this.timeout(70000);

    try {
      await CommandRunner.run("migrate -f 4", config);
      assert(false, "This should have errored.");
    } catch (_error) {
      const output = logger.contents();
      console.log(output);
      assert(output.includes("4_migrations_oog.js"));
      assert(output.includes("Deploying 'Loops'"));
      assert(output.includes("Error"));
      assert(
        output.includes("out of gas") ||
          output.includes("gas required exceeds") ||
          output.includes("check your gas limit")
      );
    }
  });

  it("should expose the reason string if available [ @ganache ]", async function () {
    this.timeout(70000);

    try {
      await CommandRunner.run("migrate -f 5", config);
      assert(false, "This should have thrown.");
    } catch (_error) {
      const output = logger.contents();
      console.log(output);
      assert(output.includes("5_migrations_reason.js"));
      assert(output.includes("Deploying 'RevertWithReason'"));
      assert(output.includes("reasonstring"));
    }
  });

  it("should error on insufficient funds correctly [ @ganache ]", async function () {
    this.timeout(70000);

    try {
      await CommandRunner.run("migrate -f 6", config);
      assert(false, "This should have thrown.");
    } catch (_error) {
      const output = logger.contents();
      console.log(output);
      assert(output.includes("6_migrations_funds.js"));
      assert(output.includes("Deploying 'Example'"));
      assert(output.includes("insufficient funds"));
      assert(output.includes("Account"));
      assert(output.includes("Balance"));
    }
  });

  it("should error on insufficient funds correctly [ @geth ]", async function () {
    this.timeout(70000);

    try {
      await CommandRunner.run("migrate -f 10", config);
      assert(false, "This should have thrown.");
    } catch (_error) {
      const output = logger.contents();
      console.log(output);
      assert(output.includes("10_migrations_funds_geth.js"));
      assert(output.includes("Deploying 'Example'"));
      assert(output.includes("insufficient funds"));
    }
  });

  it("should error if user tries to use batch syntax", async function () {
    this.timeout(70000);

    try {
      await CommandRunner.run("migrate -f 7", config);
      assert(false, "This should have thrown.");
    } catch (_error) {
      const output = logger.contents();
      console.log(output);
      assert(output.includes("7_batch_deployments.js"));
      assert(output.includes("batch deployments"));
      assert(output.includes("deprecated"));
    }
  });

  it("should error if there are js errors in the migrations script (sync)", async function () {
    this.timeout(70000);

    try {
      await CommandRunner.run("migrate -f 8", config);
      assert(false, "This should have thrown.");
    } catch (_error) {
      const output = logger.contents();
      console.log(output);
      assert(output.includes("8_js_error_sync.js"));
      assert(output.includes("ReferenceError"));
    }
  });

  it("should error if there are js errors in the migrations script (async)", async function () {
    this.timeout(70000);

    try {
      await CommandRunner.run("migrate -f 9", config);
      assert(false, "This should have thrown.");
    } catch (_error) {
      const output = logger.contents();
      console.log(output);
      assert(output.includes("9_js_error_async.js"));
      assert(output.includes("ReferenceError"));
    }
  });
});
