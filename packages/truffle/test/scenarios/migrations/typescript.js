const MemoryLogger = require("../MemoryLogger");
const CommandRunner = require("../commandRunner");
const path = require("path");
const assert = require("assert");
const Server = require("../server");
const sandbox = require("../sandbox");
const Web3 = require("web3");

describe("migrate (typescript)", function () {
  let config;
  let web3;
  let networkId;
  const project = path.join(__dirname, "../../sources/migrations/typescript");
  const logger = new MemoryLogger();

  before(async function () {
    this.timeout(10000);
    await Server.start();
    config = await sandbox.create(project);
    config.network = "development";
    config.logger = logger;
    web3 = new Web3("http://localhost:8545");
    networkId = await web3.eth.net.getId();
  });
  after(async function () {
    await Server.stop();
  });

  it("runs migrations (sync & async/await)", async function () {
    this.timeout(70000);

    await CommandRunner.run("migrate", config);
    const output = logger.contents();

    assert(output.includes("2_migrations_sync.ts"));
    assert(output.includes("Deploying 'UsesExample'"));
    assert(output.includes("3_migrations_async.ts"));
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
  });

  it("forces a migration with the -f option", async function () {
    this.timeout(70000);

    await CommandRunner.run("migrate -f 3", config);
    const output = logger.contents();
    assert(!output.includes("2_migrations_sync.ts"));
    assert(output.includes("3_migrations_async.ts"));
    assert(output.includes("Replacing 'IsLibrary'"));
    assert(output.includes("Replacing 'UsesLibrary'"));
    console.log(output);
  });
});
