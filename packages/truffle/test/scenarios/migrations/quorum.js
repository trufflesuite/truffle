const MemoryLogger = require("../memorylogger");
const CommandRunner = require("../commandrunner");
const path = require("path");
const assert = require("assert");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");
const Web3 = require("web3");

describe("migrate with [ @quorum ] interface", () => {
  if (!process.env.QUORUM) return;
  let config;
  let web3;
  let networkId;
  const project = path.join(__dirname, "../../sources/migrations/quorum");
  const logger = new MemoryLogger();

  before(async () => {
    config = await sandbox.create(project);
    config.network = "development";
    config.logger = logger;
    config.mocha = {
      reporter: new Reporter(logger)
    };

    const provider = new Web3.providers.HttpProvider("http://localhost:22000", {
      keepAlive: false
    });
    web3 = new Web3(provider);
    networkId = await web3.eth.net.getId();
    const accounts = await web3.eth.getAccounts();
    await web3.eth.personal.unlockAccount(accounts[0], "", 8000);
  });

  it("runs migrations (sync & async/await)", async () => {
    try {
      await CommandRunner.run("migrate", config);
    } catch (error) {
      console.log(logger.contents());
      throw new Error(error);
    }

    const output = logger.contents();

    assert(output.includes("2_migrations_sync.js"));
    assert(output.includes("Deploying 'UsesExample'"));
    assert(output.includes("3_migrations_async.js"));
    assert(output.includes("Re-using deployed 'Example'"));
    assert(output.includes("Replacing 'UsesExample'"));
    assert(output.includes("PayableExample"));
    assert(output.includes("1 ETH"));
    assert(output.includes("Saving migration"));
    assert(output.includes("Saving artifacts"));

    const location = path.join(
      config.contracts_build_directory,
      "UsesExample.json"
    );
    const artifact = require(location);
    const network = artifact.networks[networkId];

    assert(output.includes(network.transactionHash));
    assert(output.includes(network.address));

    console.log(output);
  }).timeout(70000);
}).timeout(10000);
