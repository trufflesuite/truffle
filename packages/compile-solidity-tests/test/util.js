const debug = require("debug")("test:util");
const fs = require("fs");
const ganache = require("ganache");
const Web3 = require("web3");
const Web3PromiEvent = require("web3-core-promievent");
const { Compile } = require("@truffle/compile-solidity");
const Config = require("@truffle/config");
const contract = require("@truffle/contract");
const path = require("path");
const { Shims } = require("@truffle/compile-common");

const log = {
  log: debug
};

const util = {
  // Persistent state
  web3: null,
  fakePromiEvent: null,
  fakeReceipt: null,
  realHash: null,
  realReceipt: null,

  // Compiles and instantiates (our friend) Example.sol
  createExample: async function () {
    return await util._createContractInstance(
      path.join(__dirname, "sources", "Example.sol")
    );
  },

  createABIV2UserDirectory: async function () {
    return await util._createContractInstance(
      path.join(__dirname, "sources", "ABIV2UserDirectory.sol")
    );
  },

  _createContractInstance: async function (sourcePath) {
    const sources = {
      [sourcePath]: fs.readFileSync(sourcePath, { encoding: "utf8" })
    };
    const config = Config.default().with({
      contracts_directory: path.join(__dirname, "sources"),
      quiet: true,
      compilers: {
        solc: {
          version: "0.8.12",
          settings: {
            optimizer: {
              enabled: false,
              runs: 200
            }
          }
        }
      }
    });
    const { compilations } = await Compile.sources({
      sources,
      options: config
    });
    const { contracts } = compilations[0];

    if (process.listeners("uncaughtException").length) {
      process.removeListener(
        "uncaughtException",
        process.listeners("uncaughtException")[0]
      );
    }

    return contract(Shims.NewToLegacy.forContract(contracts[0]));
  },

  // Spins up ganache with arbitrary options and
  // binds web3 & a contract instance to it.
  setUpProvider: async function (instance, options) {
    options = options || {};
    Object.assign(options, { logger: log, ws: true });

    let provider;
    const web3 = new Web3();

    process.env.GETH
      ? (provider = new Web3.providers.HttpProvider("http://127.0.0.1:8545", {
          keepAlive: false
        }))
      : (provider = ganache.provider(options));

    web3.setProvider(provider);
    instance.setProvider(provider);
    util.web3 = web3;

    const accounts = await web3.eth.getAccounts();

    instance.defaults({
      from: accounts[0]
    });

    return {
      web3,
      accounts
    };
  },

  // RPC Methods
  evm_mine: function () {
    return new Promise(function (accept, reject) {
      util.web3.currentProvider.send(
        {
          jsonrpc: "2.0",
          method: "evm_mine",
          id: new Date().getTime()
        },
        function (err, result) {
          err ? reject(err) : accept(result);
        }
      );
    });
  },

  // Mocks for delayed tx resolution to simulate real clients
  fakeSendTransaction: function (params) {
    util.fakePromiEvent = new Web3PromiEvent();
    var real = util.web3.eth.sendTransaction(params);

    real.on("transactionHash", hash => {
      util.realHash = hash;
      util.fakePromiEvent.eventEmitter.emit("transactionHash", hash);
    });

    real.on("receipt", function (receipt) {
      util.realReceipt = receipt;
      this.removeAllListeners();
    });

    return util.fakePromiEvent.eventEmitter;
  },

  fakeReject: function (msg) {
    var error = msg || "Transaction was not mined within 50 blocks";
    util.fakePromiEvent.reject(new Error(error));
  },

  fakeGatewayDelay(msg) {
    const error =
      msg ||
      "The contract code couldn't be stored, please check your gas limit";
    util.fakePromiEvent.reject(new Error(error));
  },

  fakeNoReceipt: function () {
    return Promise.resolve(null);
  },

  fakeGotReceipt: function (transactionHash) {
    // Verify we are polling for the right hash
    if (transactionHash === util.realHash)
      return Promise.resolve(util.realReceipt);
  },

  waitMS: async function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

module.exports = util;
