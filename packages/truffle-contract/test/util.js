var debug = require("debug")("test:util"); // eslint-disable-line no-unused-vars
var fs = require("fs");
var ganache = require("ganache-core");
var Web3 = require("web3");
var Web3PromiEvent = require("web3-core-promievent");
var Compile = require("truffle-compile/legacy");
var contract = require("../");
var path = require("path");
const { promisify } = require("util");

var log = {
  log: debug
};

var util = {
  // Persistent state
  web3: null,
  fakePromiEvent: null,
  fakeReceipt: null,
  realHash: null,
  realReceipt: null,

  // Compiles and instantiates (our friend) Example.sol
  createExample: async function() {
    return await util._createContractInstance(
      path.join(__dirname, "sources", "Example.sol"),
      "Example"
    );
  },

  createABIV2UserDirectory: async function() {
    return await util._createContractInstance(
      path.join(__dirname, "sources", "ABIV2UserDirectory.sol"),
      "ABIV2UserDirectory"
    );
  },

  _createContractInstance: async function(sourcePath, contractName) {
    var contractObj;
    const sources = {
      [sourcePath]: fs.readFileSync(sourcePath, { encoding: "utf8" })
    };
    const options = {
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
    };

    const result = await promisify(Compile)(sources, options);

    if (process.listeners("uncaughtException").length) {
      process.removeListener(
        "uncaughtException",
        process.listeners("uncaughtException")[0]
      );
    }

    contractObj = result[contractName];
    return contract(contractObj);
  },

  // Spins up ganache with arbitrary options and
  // binds web3 & a contract instance to it.
  setUpProvider: async function(instance, options) {
    options = options || {};
    Object.assign(options, { logger: log, ws: true });

    var provider;
    var web3 = new Web3();

    process.env.GETH
      ? (provider = new Web3.providers.HttpProvider("http://localhost:8545", {
          keepAlive: false
        }))
      : (provider = ganache.provider(options));

    web3.setProvider(provider);
    instance.setProvider(provider);
    util.web3 = web3;

    const accs = await web3.eth.getAccounts();

    instance.defaults({
      from: accs[0]
    });

    return {
      web3: web3,
      accounts: accs
    };
  },

  // RPC Methods
  evm_mine: function() {
    return new Promise(function(accept, reject) {
      util.web3.currentProvider.send(
        {
          jsonrpc: "2.0",
          method: "evm_mine",
          id: new Date().getTime()
        },
        function(err, result) {
          err ? reject(err) : accept(result);
        }
      );
    });
  },

  // Mocks for delayed tx resolution to simulate real clients
  fakeSendTransaction: function(params) {
    util.fakePromiEvent = new Web3PromiEvent();
    var real = util.web3.eth.sendTransaction(params);

    real.on("transactionHash", hash => {
      util.realHash = hash;
      util.fakePromiEvent.eventEmitter.emit("transactionHash", hash);
    });

    real.on("receipt", function(receipt) {
      util.realReceipt = receipt;
      this.removeAllListeners();
    });

    return util.fakePromiEvent.eventEmitter;
  },

  fakeReject: function(msg) {
    var error = msg || "Transaction was not mined within 50 blocks";
    util.fakePromiEvent.reject(new Error(error));
  },

  fakeNoReceipt: function() {
    return Promise.resolve(null);
  },

  fakeGotReceipt: function(transactionHash) {
    // Verify we are polling for the right hash
    if (transactionHash === util.realHash)
      return Promise.resolve(util.realReceipt);
  },

  waitMS: async function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

module.exports = util;
