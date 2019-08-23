const assert = require("chai").assert;
const Artifactor = require("../");
const contract = require("truffle-contract");
const Schema = require("@truffle/contract-schema");
const temp = require("temp").track();
const path = require("path");
const fs = require("fs");
const requireNoCache = require("require-nocache")(module);
const Compile = require("truffle-compile/legacy");
const Ganache = require("ganache-core");
const Web3 = require("web3");
const { promisify } = require("util");

describe("artifactor + require", () => {
  let Example;
  let accounts;
  let abi;
  let bytecode;
  let networkID;
  let artifactor;
  const provider = Ganache.provider();
  const web3 = new Web3();
  web3.setProvider(provider);

  before(() => web3.eth.net.getId().then(id => (networkID = id)));

  before(async function() {
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

    // Compile first
    const result = await promisify(Compile)(sources, options);

    // Clean up after solidity. Only remove solidity's listener,
    // which happens to be the first.
    process.removeListener(
      "uncaughtException",
      process.listeners("uncaughtException")[0] || (() => {})
    );

    const compiled = Schema.normalize(result["Example"]);
    abi = compiled.abi;
    bytecode = compiled.bytecode;

    // Setup
    const dirPath = temp.mkdirSync({
      dir: path.resolve("./"),
      prefix: "tmp-test-contract-"
    });

    const expectedFilepath = path.join(dirPath, "Example.json");

    artifactor = new Artifactor(dirPath);

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

  after(done => {
    temp.cleanupSync();
    done();
  });

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
  });

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
  });

  it("should return transaction hash, logs and receipt when using synchronised transactions", done => {
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
  });

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
      .then(
        () =>
          new Promise((accept, reject) =>
            web3.eth.getBalance(example.address, (err, balance) => {
              if (err) return reject(err);
              accept(balance);
            })
          )
      )
      .then(balance => {
        assert(balance === web3.utils.toWei("1", "ether"));
      });
  });

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
      .then(
        () =>
          new Promise((accept, reject) =>
            web3.eth.getBalance(example.address, (err, balance) => {
              if (err) return reject(err);
              accept(balance);
            })
          )
      )
      .then(balance => {
        assert(balance === web3.utils.toWei("1", "ether"));
      });
  });

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
