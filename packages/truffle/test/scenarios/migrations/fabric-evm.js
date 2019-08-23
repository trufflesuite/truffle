const MemoryLogger = require("../memorylogger");
const { promisify } = require("util");
const RunCommand = promisify(require("../commandrunner").run);
const path = require("path");
const assert = require("assert");
const Reporter = require("../reporter");
const sandbox = require("../sandbox");
const Web3 = require("web3");

describe("migrate with [ @fabric-evm ] interface", function() {
  if (!process.env.FABRICEVM) return;
  let config;
  let web3;
  let networkId;
  const project = path.join(__dirname, "../../sources/migrations/fabric-evm");
  const logger = new MemoryLogger();

  before(async function() {
    config = await sandbox.create(project);
    config.network = "development";
    config.logger = logger;
    config.mocha = {
      reporter: new Reporter(logger)
    };

    const provider = new Web3.providers.HttpProvider("http://localhost:5000", {
      keepAlive: false
    });
    web3 = new Web3(provider);
    networkId = await web3.eth.net.getId();
    networkId = web3.utils.numberToHex(networkId).replace("0x", "");
  });

  it("runs migrations (sync & async/await)", async () => {
    try {
      await RunCommand("migrate", config);
    } catch (error) {
      console.log(logger.contents());
      throw new Error(error);
    }

    const output = logger.contents();

    assert(output.includes("Saving successful migration to network"));
    assert(!output.includes("Error encountered, bailing"));
    assert(!output.includes("invalid or does not take any parameters"));

    const location = path.join(
      config.contracts_build_directory,
      "UsesExample.json"
    );
    const artifact = require(location);
    const network = artifact.networks[networkId];

    assert(output.includes(network.address));

    console.log(output);
  }).timeout(70000);
}).timeout(10000);
