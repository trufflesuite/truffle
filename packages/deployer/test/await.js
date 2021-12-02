const ganache = require("ganache");
const Web3 = require("web3");
const assert = require("assert");

const Deployer = require("../index");
const utils = require("./helpers/utils");

describe("Deployer (async / await)", function () {
  let owner;
  let options;
  let networkId;
  const provider = ganache.provider();
  const web3 = new Web3(provider);

  beforeEach(async function () {
    this.timeout(20000);
    networkId = await web3.eth.net.getId();
    const accounts = await web3.eth.getAccounts();

    owner = accounts[0];
    options = {
      contracts: null,
      networks: {
        test: {
          // TODO:
        }
      },
      network: "test",
      network_id: networkId,
      provider: provider
    };
    await utils.compile();
  });

  afterEach(async () => {
    await utils.cleanUp();
    await deployer.finish();
  });

  it("single deploy()", async function () {
    const Example = utils.getContract("Example", provider, networkId, owner);
    options.contracts = [Example];

    deployer = new Deployer(options);

    const migrate = async function () {
      await deployer.deploy(Example);
    };
    await deployer.start();
    await deployer.then(migrate);

    assert(Example.address !== null);
    assert(Example.transactionHash !== null);

    example = await Example.deployed();
    assert((await example.id()) === "Example");
  });

  it("deploy() with interdependent contracts", async function () {
    const Example = utils.getContract("Example", provider, networkId, owner);
    const UsesExample = utils.getContract(
      "UsesExample",
      provider,
      networkId,
      owner
    );

    options.contracts = [Example, UsesExample];

    deployer = new Deployer(options);
    const migrate = async function () {
      await deployer.deploy(Example);
      await deployer.deploy(UsesExample, Example.address);
    };

    await deployer.start();
    await deployer.then(migrate);

    const example = await Example.deployed();
    const usesExample = await UsesExample.deployed();

    assert(Example.address !== null);

    assert((await example.id()) === "Example");
    assert((await usesExample.id()) === "UsesExample");
    assert((await usesExample.other()) === Example.address);
  });

  it("deployer.link", async function () {
    const UsesLibrary = utils.getContract(
      "UsesLibrary",
      provider,
      networkId,
      owner
    );
    const IsLibrary = utils.getContract(
      "IsLibrary",
      provider,
      networkId,
      owner
    );
    options.contracts = [UsesLibrary, IsLibrary];

    deployer = new Deployer(options);

    const migrate = async function () {
      await deployer.deploy(IsLibrary);
      deployer.link(IsLibrary, UsesLibrary);
      await deployer.deploy(UsesLibrary);
    };

    await deployer.start();
    await deployer.then(migrate);

    assert(UsesLibrary.address !== null);
    assert(IsLibrary.address !== null);

    const usesLibrary = await UsesLibrary.deployed();
    await usesLibrary.fireIsLibraryEvent(5);
    await usesLibrary.fireUsesLibraryEvent(7);

    eventOptions = { fromBlock: 0, toBlock: "latest" };
    const events = await usesLibrary.getPastEvents("allEvents", eventOptions);

    assert(events[0].args.eventID.toNumber() === 5);
    assert(events[1].args.eventID.toNumber() === 7);
  });
});
