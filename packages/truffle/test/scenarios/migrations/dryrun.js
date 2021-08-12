const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");
const Web3 = require("web3");

describe("migrate (dry-run)", function() {
  let config;
  let web3;
  const project = path.join(__dirname, "../../sources/migrations/success");
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

  it("uses the dry-run option", async function() {
    this.timeout(70000);

    await CommandRunner.run("migrate --dry-run", config);
    const output = logger.contents();
    console.log(output);
    assert(output.includes("dry-run"));
    assert(!output.includes("transaction hash"));
    assert(output.includes("Migrations"));
    assert(output.includes("development-fork"));
    assert(output.includes("2_migrations_sync.js"));
    assert(output.includes("Deploying 'UsesExample'"));
    assert(output.includes("3_migrations_async.js"));
    assert(output.includes("Replacing 'UsesExample'"));
    assert(output.includes("Total deployments"));
  });
});
