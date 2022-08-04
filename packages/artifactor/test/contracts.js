const assert = require("chai").assert;
const Artifactor = require("../");
const contract = require("@truffle/contract");
const Schema = require("@truffle/contract-schema");
const path = require("path");
const fs = require("fs");
const Config = require("@truffle/config");
const requireNoCache = require("require-nocache")(module);
const { Compile } = require("@truffle/compile-solidity");
const Ganache = require("ganache");
const { Web3 } = require("web3");
const { Shims } = require("@truffle/compile-common");
const tmp = require("tmp");
tmp.setGracefulCleanup();

describe.skip("artifactor + require", () => {
  let Example, accounts, abi, bytecode, networkID, artifactor, config;
  const provider = Ganache.provider({
    miner: {
      instamine: "strict"
    }
  });

  const web3 = new Web3(provider);

  before(() => web3.eth.net.getId().then(id => (networkID = id)));

  before(async function () {
    this.timeout(20000);

    const sourcePath = path.join(__dirname, "Example.sol");
    const sources = {
      Example: fs.readFileSync(sourcePath, { encoding: "utf8" })
    };

    const options = {
      contracts_directory: path.join(__dirname),
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
      },
      logger: {
        log(stringToLog) {
          this.loggedStuff = this.loggedStuff + stringToLog;
        },
        loggedStuff: ""
      }
    };
    config = Config.default().with(options);

    // Compile first
    const { compilations } = await Compile.sources({
      sources,
      options: config
    });
    const { contracts } = compilations[0];

    // Clean up after solidity. Only remove solidity's listener,
    // which happens to be the first.
    process.removeListener(
      "uncaughtException",
      process.listeners("uncaughtException")[0] || (() => {})
    );

    const exampleContract = contracts.find(
      contract => contract.contractName === "Example"
    );
    const compiled = Schema.normalize(
      Shims.NewToLegacy.forContract(exampleContract)
    );
    abi = compiled.abi;
    bytecode = compiled.bytecode;

    // Setup
    const tempDir = tmp.dirSync({
      unsafeCleanup: true,
      prefix: "tmp-test-contract-"
    });

    const expectedFilepath = path.join(tempDir.name, "Example.json");

    artifactor = new Artifactor(tempDir.name);

    await artifactor
      .save({
        contractName: "Example",
        abi,
        bytecode,
        networks: {
          [`${networkID}`]: {
            address: "0xe6e1652a0397e078f434d6dda181b218cfd42e01"
          }
        }
      })
      .then(() => {
        const json = requireNoCache(expectedFilepath);
        Example = contract(json);
        Example.setProvider(provider);
      });
  });

  before(() =>
    web3.eth.getAccounts().then(_accounts => {
      accounts = _accounts;

      Example.defaults({
        from: accounts[0]
      });
    })
  );

  it("should set the transaction hash of contract instantiation", () =>
    Example.new(1, { gas: 3141592 }).then(({ transactionHash }) => {
      assert(transactionHash, "transactionHash should be non-empty");
    }));

  it("should get and set values via methods and get values via .call", done => {
    let example;
    Example.new(1, { gas: 3141592 })
      .then(instance => {
        example = instance;
        return example.value.call();
      })
      .then(value => {
        assert.equal(value.valueOf(), 1, "Starting value should be 1");
        return example.setValue(5);
      })
      .then(() => example.value.call())
      .then(value => {
        assert.equal(parseInt(value), 5, "Ending value should be five");
      })
      .then(done)
      .catch(done);
    // TODO: investigate why timeout needed to be increased
    //  issue: https://github.com/web3/web3.js/issues/6311
  }).timeout(3000);

  it("shouldn't synchronize constant functions", done => {
    let example;
    Example.new(5, { gas: 3141592 })
      .then(instance => {
        example = instance;
        return example.getValue();
      })
      .then(value => {
        assert.equal(
          value.valueOf(),
          5,
          "Value should have been retrieved without explicitly calling .call()"
        );
      })
      .then(done)
      .catch(done);
  });

  it("should allow BigNumbers as input parameters, and not confuse them as transaction objects", done => {
    // BigNumber passed on new()
    let example = null;
    Example.new("30", { gas: 3141592 })
      .then(instance => {
        example = instance;
        return example.value.call();
      })
      .then(value => {
        assert.equal(parseInt(value), 30, "Starting value should be 30");
        // BigNumber passed in a transaction.
        return example.setValue("25", { gas: 3141592 });
      })
      .then(() => example.value.call())
      .then(value => {
        assert.equal(parseInt(value), 25, "Ending value should be twenty-five");
        // BigNumber passed in a call.
        return example.parrot.call(865);
      })
      .then(parrotValue => {
        assert.equal(
          parseInt(parrotValue),
          865,
          "Parrotted value should equal 865"
        );
      })
      .then(done)
      .catch(done);
    // TODO: investigate why timeout needed to be increased
    //  issue: https://github.com/web3/web3.js/issues/6311
  }).timeout(3000);

  // TODO: un-skip the test to investigate the error:
  //  "AssertionError: expected 'ExampleEvent' to equal undefined"
  // The issue seems to be that the returned logs are not of an event.
  //  (The returned log does not include the properties: `event` and `args`)
  // logs: [
  //   {
  //     address: '0x608fcae953f6ecbb979bd670260fea9052a7e527',
  //     blockHash: '0x3a5f39352e0fd37c6a0b7870b16d585a10dde1fec30b0e1b64b6065caef5469a',
  //     blockNumber: 2n,
  //     logIndex: 0n,
  //     removed: false,
  //     transactionHash: '0xd9ad9f8a3d74c8bad000249977ec60d8313b2e4bbc389de06709a45cd5e0cb31',
  //     transactionIndex: 0n
  //   }
  // ]
  //
  //  issue: https://github.com/web3/web3.js/issues/6312
  it.skip(
    "should return transaction hash, logs and receipt when using synchronised transactions",
    async done => {
      let example = null;
      Example.new("1", { gas: 3141592 })
        .then(instance => {
          example = instance;
          return example.triggerEvent();
        })
        .then(({ tx, logs, receipt }) => {
          assert.isDefined(tx, "transaction hash wasn't returned");
          assert.isDefined(
            logs,
            "synchronized transaction didn't return any logs"
          );
          assert.isDefined(
            receipt,
            "synchronized transaction didn't return a receipt"
          );
          assert.isOk(tx.length > 42, "Unexpected transaction hash"); // There has to be a better way to do this.
          assert.equal(
            tx,
            receipt.transactionHash,
            "Transaction had different hash than receipt"
          );
          assert.equal(logs.length, 1, "logs array expected to be 1");

          const log = logs[0];

          assert.equal("ExampleEvent", log.event);
          assert.equal(accounts[0], log.args._from);
          assert.equal(8, log.args.num); // 8 is a magic number inside Example.sol
        })
        .then(done)
        .catch(done);
      // TODO: investigate why timeout needed to be increased
      //  issue: https://github.com/web3/web3.js/issues/6311
    }
  ).timeout(3000);

  it("should trigger the fallback function when calling sendTransaction()", () => {
    let example = null;
    return Example.new("1", { gas: 3141592 })
      .then(instance => {
        example = instance;
        return example.fallbackTriggered();
      })
      .then(triggered => {
        assert(
          triggered === false,
          "Fallback should not have been triggered yet"
        );
        return example.sendTransaction({
          value: web3.utils.toWei("1", "ether")
        });
      })
      .then(() => web3.eth.getBalance(example.address))
      .then(balance => {
        assert(
          balance.toString() === web3.utils.toWei("1", "ether"),
          "1 ether has been sent but the balance does not match that"
        );
      });
    // TODO: investigate why timeout needed to be increased
    //  issue: https://github.com/web3/web3.js/issues/6311
  }).timeout(3000);

  it("should trigger the fallback function when calling send() (shorthand notation)", () => {
    let example = null;
    return Example.new("1", { gas: 3141592 })
      .then(instance => {
        example = instance;
        return example.fallbackTriggered();
      })
      .then(triggered => {
        assert(
          triggered === false,
          "Fallback should not have been triggered yet"
        );
        return example.send(web3.utils.toWei("1", "ether"));
      })
      .then(() => web3.eth.getBalance(example.address))
      .then(balance => {
        assert(
          balance.toString() === web3.utils.toWei("1", "ether"),
          "1 ether has been sent but the balance does not match that"
        );
      });
    // TODO: investigate why timeout needed to be increased
    //  issue: https://github.com/web3/web3.js/issues/6311
  }).timeout(3000);

  it("errors when setting an invalid provider", done => {
    try {
      Example.setProvider(null);
      assert.fail("setProvider() should have thrown an error");
    } catch (e) {
      // Do nothing with the error.
    }
    done();
  });

  it("creates a network object when an address is set if no network specified", done => {
    const NewExample = contract({
      abi,
      bytecode
    });

    NewExample.setProvider(provider);
    NewExample.defaults({
      from: accounts[0]
    });

    assert.equal(NewExample.network_id, null);

    NewExample.new(1, { gas: 3141592 })
      .then(({ address }) => {
        // We have a network id in this case, with new(), since it was detected,
        // but no further configuration.
        assert.equal(NewExample.network_id, networkID);
        assert.equal(NewExample.toJSON().networks[networkID], null);

        NewExample.address = address;

        assert.equal(NewExample.toJSON().networks[networkID].address, address);

        done();
      })
      .catch(done);
  });

  it("doesn't error when calling .links() or .events() with no network configuration", done => {
    const eventABI = {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          name: "nameHash",
          type: "bytes32"
        },
        {
          indexed: true,
          name: "releaseHash",
          type: "bytes32"
        }
      ],
      name: "PackageRelease",
      type: "event"
    };

    const MyContract = contract({
      contractName: "MyContract",
      abi: [eventABI],
      bytecode: "0x12345678"
    });

    MyContract.setNetwork(5);

    const expectedEventTopic = web3.utils.sha3(
      "PackageRelease(bytes32,bytes32)"
    );

    // We want to make sure these don't throw when a network configuration doesn't exist.
    // While we're at it, lets make sure we still get the event we expect.
    assert.deepEqual(MyContract.links, {});
    assert.deepEqual(MyContract.events[expectedEventTopic], eventABI);

    done();
  });
});
