const ganache = require("ganache");
const Web3 = require("web3");
const { createInterfaceAdapter } = require("@truffle/interface-adapter");
const assert = require("assert");
const Reporter = require("@truffle/reporters").migrationsV5;
const EventEmitter = require("events");

const Deployer = require("../index");
const utils = require("./helpers/utils");

describe("Deployer (sync)", function() {
  let owner;
  let options;
  let networkId;
  let deployer;
  let reporter;
  let output = "";
  let Example;
  let UsesExample;
  let IsLibrary;
  let UsesLibrary;

  const provider = ganache.provider({
    vmErrorsOnRPCResponse: false
  });

  const mockMigration = {
    emitter: new EventEmitter()
  };

  const web3 = new Web3(provider);

  beforeEach(async function() {
    networkId = await web3.eth.net.getId();
    const accounts = await web3.eth.getAccounts();

    owner = accounts[0];
    await utils.compile();

    Example = utils.getContract("Example", provider, networkId, owner);
    const ExampleRevert = utils.getContract(
      "ExampleRevert",
      provider,
      networkId,
      owner
    );
    UsesExample = utils.getContract("UsesExample", provider, networkId, owner);
    UsesLibrary = utils.getContract("UsesLibrary", provider, networkId, owner);
    IsLibrary = utils.getContract("IsLibrary", provider, networkId, owner);
    const Abstract = utils.getContract("Abstract", provider, networkId, owner);

    options = {
      contracts: [
        Example,
        ExampleRevert,
        UsesExample,
        IsLibrary,
        UsesLibrary,
        Abstract
      ],
      networks: {
        test: {
          // TODO:
        }
      },
      network: "test",
      network_id: networkId,
      provider: provider,
      logger: {
        log: val => {
          if (val) output += `${val}\n`;
        },
        error: val => {
          if (val) output += `${val}\n`;
        }
      }
    };
  });

  afterEach(() => {
    output = "";
    utils.cleanUp();
    deployer.finish();
  });

  async function setUpWithConfig(config) {
    deployer = new Deployer(config);
    reporter = new Reporter();
    reporter.setDeployer(deployer);
    reporter.setMigration(mockMigration);
    reporter.listen();
  }

  // in this describe block, `setUpWithConfig` is **not** called in a `beforeEach`
  // as each test is expected to vary the truffle config passed to `Deployer`
  describe('custom config', () => {
    it("deployment with default polling interval", async function() {
      const customConfig = {
        ...options,
        networks: {
          test: {
            // deploymentPollingInterval value not set
          }
        }
      };
      deployer = new Deployer(customConfig);
      assert.strictEqual(
        deployer.pollingInterval,
        4000,
        "default value of config.networks.test.deploymentPollingInterval expected");
    });

    it("deployment configurable with custom polling interval", async function() {
      const customConfig = {
        ...options,
        networks: {
          test: {
            deploymentPollingInterval: 8000
          }
        }
      };
      deployer = new Deployer(customConfig);
      assert.strictEqual(
        deployer.pollingInterval,
        8000,
        "custom value from config.networks.test.deploymentPollingInterval expected");
    });
  });

  // in this describe block, `setUpWithConfig` **is** called in a `beforeEach`
  // as each test is expected to pass the default truffle config into `Deployer`
  describe('default config', () => {
    beforeEach(async function beforeEachWithDefaultConfig() {
      // simply pass default options
      await setUpWithConfig(options);
    });

    it("deploy()", async function() {
      const migrate = function() {
        deployer.deploy(Example);
      };

      migrate();

      await deployer.start();

      assert(Example.address !== null);
      assert(Example.transactionHash !== null);

      const example = await Example.deployed();
      const id = await example.id();

      assert(id === "Example");
      assert(output.includes("Example"));
      assert(output.includes("Deploying"));
      assert(output.includes("transaction hash"));
      assert(output.includes("address"));
      assert(output.includes("gas used"));
    });

    it("deploy().then", async function() {
      function migrate() {
        deployer
          .deploy(Example)
          .then(() => deployer.deploy(UsesExample, Example.address));
      }

      migrate();
      await deployer.start();

      const example = await Example.deployed();
      const usesExample = await UsesExample.deployed();
      const exampleId = await example.id();
      const usesExampleId = await usesExample.id();
      const other = await usesExample.other();

      assert(Example.address !== null);
      assert(exampleId === "Example");
      assert(usesExampleId === "UsesExample");
      assert(other === Example.address);

      assert(output.includes("Replacing"));
      assert(output.includes("Deploying"));
      assert(output.includes("Example"));
      assert(output.includes("UsesExample"));
    });

    it("deployer.then", async function() {
      function migrate() {
        deployer.then(async function() {
          const example = await deployer.deploy(Example);
          await deployer.deploy(UsesExample, example.address);
        });
      }

      migrate();
      await deployer.start();

      const example = await Example.deployed();
      const usesExample = await UsesExample.deployed();
      const exampleId = await example.id();
      const usesExampleId = await usesExample.id();
      const other = await usesExample.other();

      assert(Example.address !== null);
      assert(exampleId === "Example");
      assert(usesExampleId === "UsesExample");
      assert(other === Example.address);

      assert(output.includes("Replacing"));
      assert(output.includes("Example"));
      assert(output.includes("UsesExample"));
    });

    it("deployer.link", async function() {
      const migrate = function() {
        deployer.deploy(IsLibrary);
        deployer.link(IsLibrary, UsesLibrary);
        deployer.deploy(UsesLibrary);
      };

      migrate();

      await deployer.start();

      assert(UsesLibrary.address !== null);
      assert(IsLibrary.address !== null);

      const usesLibrary = await UsesLibrary.deployed();
      await usesLibrary.fireIsLibraryEvent(5);
      await usesLibrary.fireUsesLibraryEvent(7);

      const eventOptions = { fromBlock: 0, toBlock: "latest" };
      const events = await usesLibrary.getPastEvents("allEvents", eventOptions);

      assert(events[0].args.eventID.toNumber() === 5);
      assert(events[1].args.eventID.toNumber() === 7);

      assert(output.includes("Deploying"));
      assert(output.includes("Linking"));
      assert(output.includes("IsLibrary"));
      assert(output.includes("UsesLibrary"));
    });

    // There's a chain like this in the @truffle/core solidity-tests
    it("deployer.deploy().then()", async function() {
      const migrate = function() {
        deployer
          .deploy(Example)
          .then(function() {
            return Example.deployed();
          })
          .then(function(instance) {
            return instance.id();
          })
          .then(function() {
            return deployer
              .deploy(UsesExample, utils.zeroAddress)
              .then(function() {
                return UsesExample.deployed();
              })
              .then(function(usesExample) {
                return usesExample.id();
              });
          });
      };
      migrate();

      await deployer.start();
      assert(output.includes("Example"));
      assert(output.includes("UsesExample"));
    });

    it("waits for confirmations", async function() {
      this.timeout(15000);
      const startBlock = await web3.eth.getBlockNumber();

      utils.startAutoMine(web3, 1500);

      const migrate = function() {
        deployer.deploy(IsLibrary);
        deployer.deploy(Example);
      };

      migrate();

      deployer.confirmations = 2;
      await deployer.start();

      utils.stopAutoMine();

      const libReceipt = await web3.eth.getTransactionReceipt(
        IsLibrary.transactionHash
      );
      const exampleReceipt = await web3.eth.getTransactionReceipt(
        Example.transactionHash
      );

      // The first confirmation is the block that accepts the tx. Then we wait two more.
      // Then Example is deployed in the consequent block.
      assert(libReceipt.blockNumber === startBlock + 1);
      assert(exampleReceipt.blockNumber === libReceipt.blockNumber + 3);

      deployer.confirmationsRequired = 0;
    });

    it("emits block events while waiting for a tx to mine", async function() {
      this.timeout(15000);

      utils.startAutoMine(web3, 4000);

      const interfaceAdapter = createInterfaceAdapter({ provider });

      const migrate = function() {
        deployer.then(async function() {
          await deployer._startBlockPolling(interfaceAdapter);
          await utils.waitMS(9000);
          await deployer._startBlockPolling(interfaceAdapter);
        });
      };

      migrate();
      await deployer.start();
      utils.stopAutoMine();

      // We used to test output here but the ora spinner doesn't use the logger
      // Keeping this test just to run the logic, make sure it's not crashing.
    });
  });
});
