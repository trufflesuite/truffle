// Override artifactor
const Config = require("@truffle/config");
const { assert } = require("chai");
const contract = require("@truffle/contract");
const Web3 = require("web3");
const debug = require("debug")("ganache");
const Ganache = require("ganache");
const path = require("path");
const fs = require("fs");
const { Compile } = require("@truffle/compile-solidity");
const { Shims } = require("@truffle/compile-common");
const sinon = require("sinon");

// Clean up after solidity. Only remove solidity's listener,
// which happens to be the first.
process.removeListener(
  "uncaughtException",
  process.listeners("uncaughtException")[0] || (() => {})
);

const log = {
  log: debug
};

let provider = Ganache.provider({ logger: log });
let web3 = new Web3();
web3.setProvider(provider);

describe("Library linking", () => {
  let LibraryExample;
  let networkId;

  before(async () => {
    networkId = await web3.eth.net.getId();
    LibraryExample = contract({
      contractName: "LibraryExample",
      abi: [],
      binary:
        "606060405260ea8060106000396000f3606060405260e060020a600035046335b09a6e8114601a575b005b601860e160020a631ad84d3702606090815273__A_____________________________________906335b09a6e906064906020906004818660325a03f415600257506040805160e160020a631ad84d37028152905173__B_____________________________________9350600482810192602092919082900301818660325a03f415600257506040805160e160020a631ad84d37028152905173821735ac2129bdfb20b560de2718783caf61ad1c9350600482810192602092919082900301818660325a03f41560025750505056"
    });
    LibraryExample.setNetwork(networkId);
  });

  it("leaves binary unlinked initially", () => {
    assert(
      LibraryExample.binary.indexOf(
        "__A_____________________________________"
      ) >= 0
    );
  });

  it("links first library properly", () => {
    LibraryExample.link("A", "0x1234567890123456789012345678901234567890");

    assert(
      LibraryExample.binary.indexOf("__A_____________________________________"),
      -1
    );
    assert(
      LibraryExample.binary ===
        "0x606060405260ea8060106000396000f3606060405260e060020a600035046335b09a6e8114601a575b005b601860e160020a631ad84d37026060908152731234567890123456789012345678901234567890906335b09a6e906064906020906004818660325a03f415600257506040805160e160020a631ad84d37028152905173__B_____________________________________9350600482810192602092919082900301818660325a03f415600257506040805160e160020a631ad84d37028152905173821735ac2129bdfb20b560de2718783caf61ad1c9350600482810192602092919082900301818660325a03f41560025750505056"
    );
  });

  it("links second library properly", () => {
    LibraryExample.link("B", "0x1111111111111111111111111111111111111111");

    assert(
      LibraryExample.binary.indexOf("__B_____________________________________"),
      -1
    );
    assert(
      LibraryExample.binary ===
        "0x606060405260ea8060106000396000f3606060405260e060020a600035046335b09a6e8114601a575b005b601860e160020a631ad84d37026060908152731234567890123456789012345678901234567890906335b09a6e906064906020906004818660325a03f415600257506040805160e160020a631ad84d3702815290517311111111111111111111111111111111111111119350600482810192602092919082900301818660325a03f415600257506040805160e160020a631ad84d37028152905173821735ac2129bdfb20b560de2718783caf61ad1c9350600482810192602092919082900301818660325a03f41560025750505056"
    );
  });

  it("allows for selective relinking", () => {
    assert(
      LibraryExample.binary.indexOf("__A_____________________________________"),
      -1
    );
    assert(
      LibraryExample.binary.indexOf("__B_____________________________________"),
      -1
    );

    LibraryExample.link("A", "0x2222222222222222222222222222222222222222");

    assert(
      LibraryExample.binary ===
        "0x606060405260ea8060106000396000f3606060405260e060020a600035046335b09a6e8114601a575b005b601860e160020a631ad84d37026060908152732222222222222222222222222222222222222222906335b09a6e906064906020906004818660325a03f415600257506040805160e160020a631ad84d3702815290517311111111111111111111111111111111111111119350600482810192602092919082900301818660325a03f415600257506040805160e160020a631ad84d37028152905173821735ac2129bdfb20b560de2718783caf61ad1c9350600482810192602092919082900301818660325a03f41560025750505056"
    );
  });
});

describe("Library linking with contract objects", () => {
  let ExampleLibrary;
  let ExampleLibraryConsumer;
  let accounts;
  let web3;
  let networkId;
  let provider = Ganache.provider({ logger: log });
  web3 = new Web3();
  web3.setProvider(provider);

  before(async function () {
    this.timeout(10000);

    networkId = await web3.eth.net.getId();
    const exampleLibraryPath = path.join(
      __dirname,
      "sources",
      "ExampleLibrary.sol"
    );
    const exampleLibraryConsumerPath = path.join(
      __dirname,
      "sources",
      "ExampleLibraryConsumer.sol"
    );
    const sources = {
      "ExampleLibrary.sol": fs.readFileSync(exampleLibraryPath, {
        encoding: "utf8"
      }),
      "ExampleLibraryConsumer.sol": fs.readFileSync(
        exampleLibraryConsumerPath,
        { encoding: "utf8" }
      )
    };

    const config = Config.default().with({
      contracts_directory: path.join(__dirname, "sources"),
      quiet: true,
      compilers: {
        solc: {
          version: "0.5.0",
          settings: {
            optimizer: {
              enabled: false,
              runs: 200
            }
          }
        }
      }
    });

    // Compile first
    const { compilations } = await Compile.sources({
      sources,
      options: config
    });

    const exampleLibrary = compilations[0].contracts.find(contract => {
      return contract.contractName === "ExampleLibrary";
    });

    ExampleLibrary = contract(Shims.NewToLegacy.forContract(exampleLibrary));
    ExampleLibrary.setProvider(provider);

    const exampleLibraryConsumer = compilations[0].contracts.find(contract => {
      return contract.contractName === "ExampleLibraryConsumer";
    });

    ExampleLibraryConsumer = contract(
      Shims.NewToLegacy.forContract(exampleLibraryConsumer)
    );
    ExampleLibraryConsumer.setProvider(provider);
  });

  before(async () => {
    accounts = await web3.eth.getAccounts();
    ExampleLibrary.defaults({
      from: accounts[0]
    });
    ExampleLibraryConsumer.defaults({
      from: accounts[0]
    });
    ExampleLibrary.setNetwork(networkId);
    ExampleLibraryConsumer.setNetwork(networkId);
  });

  before("deploy library", async () => {
    const instance = await ExampleLibrary.new({ gas: 3141592 });
    ExampleLibrary.address = instance.address;
  });

  it("consumes library's events when linked", async () => {
    ExampleLibraryConsumer.link(ExampleLibrary);
    assert.equal(Object.keys(ExampleLibraryConsumer.events || {}).length, 1);

    const consumer = await ExampleLibraryConsumer.new({ gas: 3141592 });
    const result = await consumer.triggerLibraryEvent();
    assert.equal(result.logs.length, 1);

    const log = result.logs[0];
    assert.equal(log.event, "LibraryEvent");
    assert.equal(accounts[0], log.args._from);
    assert.equal(8, log.args.num); // 8 is a magic number inside ExampleLibrary.sol
  });
});

describe(".link(name, address)", () => {
  let instance;
  beforeEach(async () => {
    accounts = await web3.eth.getAccounts();
    networkId = await web3.eth.net.getId();
    ExampleContract = contract({
      contractName: "ExampleContract",
      abi: [],
    });
    LibraryExample = contract({
      contractName: "A",
      abi: [],
      binary: "606060405260ea8060106000396000f3606060405a03f41560025750505056"
    });
    LibraryExample.setProvider(provider);
    ExampleContract.setNetwork(networkId);
    LibraryExample.setNetwork(networkId);
    instance = await LibraryExample.new({ from: accounts[0] });
    LibraryExample.address = "0x1234567890123456789012345678901234567890";
    sinon.stub(LibraryExample, "isDeployed").returns(true);
  });

  afterEach(() => {
    LibraryExample.isDeployed.restore();
  });

  it("will accept a contract type", () => {
    ExampleContract.link(LibraryExample);
    assert(ExampleContract.links["A"], instance.address);
  });

  it("will accept a name and address", () => {
    const address = "0x1234567890";
    ExampleContract.link("HamburgerConversionLib", address);
    assert(ExampleContract.links["HamburgerConversionLib"], address);
  });

  it("will accept a contract instance", () => {
    ExampleContract.link(instance);
    assert(ExampleContract.links["A"], instance.address);
  });

  it("will error with improper input", () => {
    const expectedMessageSnippet = "Input to the link method is in the " +
      "incorrect format.";
    try {
      ExampleContract.link(1);
    } catch (error) {
      assert(error.message.includes(expectedMessageSnippet));
    }
  });
});
