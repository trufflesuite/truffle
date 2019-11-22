const {
  Web3Shim,
  createInterfaceAdapter
} = require("@truffle/interface-adapter");
const Config = require("@truffle/config");
const Migrate = require("@truffle/migrate");
const TestResolver = require("./testresolver");
const TestSource = require("./testsource");
const expect = require("@truffle/expect");
const contract = require("@truffle/contract");
const abi = require("web3-eth-abi");
const path = require("path");
const fs = require("fs-extra");
const flatMap = require("lodash.flatmap");
const util = require("util");
const debug = require("debug")("lib:testing:testrunner");

function TestRunner(options = {}) {
  expect.options(options, [
    "resolver",
    "provider",
    "contracts_build_directory"
  ]);

  this.config = Config.default().merge(options);

  this.logger = options.logger || console;
  this.initial_resolver = options.resolver;
  this.provider = options.provider;

  this.can_snapshot = false;
  this.first_snapshot = true;
  this.initial_snapshot = null;
  this.known_events = {};
  this.interfaceAdapter = createInterfaceAdapter({
    provider: options.provider,
    networkType: options.networks[options.network].type
  });
  this.web3 = new Web3Shim({
    provider: options.provider,
    networkType: options.networks[options.network].type
  });

  // For each test
  this.currentTestStartBlock = null;

  this.BEFORE_TIMEOUT =
    (options.mocha && options.mocha.before_timeout) || 120000;
  this.TEST_TIMEOUT = (options.mocha && options.mocha.timeout) || 300000;
}

TestRunner.prototype.initialize = async function() {
  debug("initializing");
  let test_source = new TestSource(this.config);
  this.config.resolver = new TestResolver(
    this.initial_resolver,
    test_source,
    this.config.contracts_build_directory
  );

  if (this.first_snapshot) {
    // // Make the initial deployment (full migration).
    // await this.deploy();

    try {
      let initial_snapshot = await this.snapshot();
      this.can_snapshot = true;
      this.initial_snapshot = initial_snapshot;
    } catch (_) {}
    this.first_snapshot = false;
  } else {
    await this.resetState();
  }

  let files = await fs.readdir(this.config.contracts_build_directory);

  files = files.filter(file => path.extname(file) === ".json");

  let data = await Promise.all(
    files.map(
      async file =>
        await fs.readFile(
          path.join(this.config.contracts_build_directory, file),
          "utf8"
        )
    )
  );

  let contracts = data.map(JSON.parse).map(json => contract(json));
  //flatMap is only on Node 11 & later at the moment, so we'll use
  //lodash's flatMap
  let abis = flatMap(contracts, "abi");

  abis.map(abi => {
    if (abi.type === "event") {
      let signature =
        abi.name + "(" + abi.inputs.map(input => input.type).join(",") + ")";
      this.known_events[this.web3.utils.sha3(signature)] = {
        signature: signature,
        abi_entry: abi
      };
    }
  });
};

TestRunner.prototype.deploy = async function() {
  await Migrate.run(
    this.config.with({
      reset: true,
      quiet: true
    })
  );
};

TestRunner.prototype.resetState = async function() {
  if (this.can_snapshot) {
    await this.revert(this.initial_snapshot);
    this.initial_snapshot = await this.snapshot();
  } else {
    await this.deploy();
  }
};

TestRunner.prototype.startTest = async function() {
  let blockNumber = await this.web3.eth.getBlockNumber();
  let one = this.web3.utils.toBN(1);
  blockNumber = this.web3.utils.toBN(blockNumber);

  // Add one in base 10
  this.currentTestStartBlock = blockNumber.add(one);
};

TestRunner.prototype.endTest = async function(mocha) {
  // Skip logging if test passes and `show-events` option is not true
  if (mocha.currentTest.state !== "failed" && !this.config["show-events"]) {
    return;
  }

  let logs = await this.web3.eth.getPastLogs({
    fromBlock: "0x" + this.currentTestStartBlock.toString(16)
  });

  if (logs.length === 0) {
    this.logger.log("    > No events were emitted");
    return;
  }

  this.logger.log("\n    Events emitted during test:");
  this.logger.log("    ---------------------------");
  this.logger.log("");

  for (let log of logs) {
    let event = this.known_events[log.topics[0]];

    if (event == null) {
      return; // do not log anonymous events
    }

    let types = event.abi_entry.inputs.map(input => input.type);

    let values;
    try {
      values = abi.decodeLog(
        event.abi_entry.inputs,
        log.data,
        log.topics.slice(1) // skip topic[0] for non-anonymous event
      );
    } catch (_) {
      //temporary HACK until we're using the new decoder
      this.logger.log(`    Warning: event decoding failed`);
      this.logger.log(
        `    (This may be due to multiple events with same signature`
      );
      this.logger.log(`    or due to unsupported data types)`);
      return;
    }

    let eventName = event.abi_entry.name;
    let eventArgs = event.abi_entry.inputs
      .map((input, index) => {
        let prefix = input.indexed === true ? "<indexed> " : "";
        let value = `${values[index]} (${types[index]})`;
        return `${input.name}: ${prefix}${value}`;
      })
      .join(", ");

    this.logger.log(`    ${eventName}(${eventArgs})`);
  }
  this.logger.log("\n    ---------------------------");
};

TestRunner.prototype.snapshot = async function() {
  return (await this.rpc("evm_snapshot")).result;
};

TestRunner.prototype.revert = async function(snapshot_id) {
  await this.rpc("evm_revert", [snapshot_id]);
};

TestRunner.prototype.rpc = async function(method, arg) {
  let request = {
    jsonrpc: "2.0",
    method: method,
    id: Date.now(),
    params: arg
  };

  let result = await util.promisify(this.provider.send)(request);

  if (result.error != null) {
    throw new Error("RPC Error: " + (result.error.message || result.error));
  }
};

module.exports = TestRunner;
