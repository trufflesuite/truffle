const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");
const Web3 = require("web3");

describe("migration errors", function() {
  let config;
  let web3;
  let networkId;
  const project = path.join(__dirname, "../../sources/migrations/error");
  const logger = new MemoryLogger();

  before(done => Server.start(done));
  after(done => Server.stop(done));

  before(async function() {
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

  it("should error and stop", function(done) {
    this.timeout(70000);

    CommandRunner.run("migrate", config, err => {
      const output = logger.contents();
      console.log(output);
      assert(err);

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
      done();
    });
  });

  it("should run from the last successfully completely migration", function(done) {
    this.timeout(70000);

    CommandRunner.run("migrate", config, err => {
      const output = logger.contents();
      console.log(output);
      assert(err);

      assert(!output.includes("1_initial_migration.js"));
      assert(output.includes("2_migrations_revert.js"));
      done();
    });
  });

  it("should run out of gas correctly", function(done) {
    this.timeout(70000);

    CommandRunner.run("migrate -f 4", config, err => {
      const output = logger.contents();
      assert(err);
      console.log(output);
      assert(output.includes("4_migrations_oog.js"));
      assert(output.includes("Deploying 'Loops'"));
      assert(output.includes("Error"));
      assert(
        output.includes("out of gas") || output.includes("gas required exceeds")
      );
      done();
    });
  });

  it("should expose the reason string if available [ @ganache ]", function(done) {
    this.timeout(70000);

    CommandRunner.run("migrate -f 5", config, err => {
      const output = logger.contents();
      assert(err);
      console.log(output);
      assert(output.includes("5_migrations_reason.js"));
      assert(output.includes("Deploying 'RevertWithReason'"));
      assert(output.includes("reasonstring"));
      done();
    });
  });

  it("should error on insufficient funds correctly", function(done) {
    this.timeout(70000);

    CommandRunner.run("migrate -f 6", config, err => {
      const output = logger.contents();
      assert(err);
      console.log(output);
      assert(output.includes("6_migrations_funds.js"));
      assert(output.includes("Deploying 'Example'"));
      assert(output.includes("insufficient funds"));
      assert(output.includes("Account"));
      assert(output.includes("Balance"));
      done();
    });
  });

  it("should error if user tries to use batch syntax", function(done) {
    this.timeout(70000);

    CommandRunner.run("migrate -f 7", config, err => {
      const output = logger.contents();
      assert(err);
      console.log(output);
      assert(output.includes("7_batch_deployments.js"));
      assert(output.includes("batch deployments"));
      assert(output.includes("deprecated"));
      done();
    });
  });

  it("should error if there are js errors in the migrations script (sync)", function(done) {
    this.timeout(70000);

    CommandRunner.run("migrate -f 8", config, err => {
      const output = logger.contents();
      assert(err);
      console.log(output);
      assert(output.includes("8_js_error_sync.js"));
      assert(output.includes("ReferenceError"));
      done();
    });
  });

  it("should error if there are js errors in the migrations script (async)", function(done) {
    this.timeout(70000);

    CommandRunner.run("migrate -f 9", config, err => {
      const output = logger.contents();
      assert(err);
      console.log(output);
      assert(output.includes("9_js_error_async.js"));
      assert(output.includes("ReferenceError"));
      done();
    });
  });
});
