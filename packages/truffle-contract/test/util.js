var debug = require("debug")("ganache-core");
var fs = require("fs");
var ganache = require("ganache-core");
var Web3 = require("web3");
var Web3PromiEvent = require('web3-core-promievent');
var solc = require("solc");
var contract = require("../");

var log = {
  log: debug
}

var util = {
  // Persistent state
  web3: null,
  fakePromiEvent: null,
  fakeReceipt: null,
  realHash: null,
  realReceipt: null,

  // Compiles and instantiates (our friend) Example.sol
  createExample: function() {
    var contractObj;
    var contractName;

    var result = solc.compile(fs.readFileSync("./test/sources/Example.sol", {encoding: "utf8"}), 1);

    if (process.listeners("uncaughtException").length){
      process.removeListener("uncaughtException", process.listeners("uncaughtException")[0]);
    }

    (result.contracts["Example"])
      ? contractName = "Example"
      : contractName = ":Example";

    contractObj = result.contracts[contractName];
    contractObj.contractName = contractName;
    return contract(contractObj);
  },

  // Spins up ganache with arbitrary options and
  // binds web3 & a contract instance to it.
  setUpProvider: function(instance, options){
    options = options || {};
    Object.assign(options, {logger: log, ws: true})

    return new Promise(function(accept, reject){
      var provider;
      var web3 = new Web3();

      (process.env.GETH)
        ? provider = new Web3.providers.WebsocketProvider('ws://localhost:8546')
        : provider = ganache.provider(options);

      web3.setProvider(provider);
      instance.setProvider(provider);
      util.web3 = web3;

      web3.eth.getAccounts(function(err, accs) {
        if (err) reject(err);
        instance.defaults({
          from: accs[0]
        });

        accept({
          web3: web3,
          accounts: accs
        });
      });
    })
  },

  // RPC Methods
  evm_mine: function(){
    return new Promise(function(accept, reject){
      util.web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_mine",
        id: new Date().getTime()
      }, function(err, result){
          (err) ? reject(err) : accept(result);
      });
    });
  },

  // Mocks for delayed tx resolution to simulate real clients
  fakeSendTransaction: function(params){
    util.fakePromiEvent = new Web3PromiEvent();
    var real = util.web3.eth.sendTransaction(params)

    real.on('transactionHash', hash => {
      util.realHash = hash;
      util.fakePromiEvent.eventEmitter.emit('transactionHash', hash)
    });

    real.on('receipt', function(receipt) {
      util.realReceipt = receipt;
      this.removeAllListeners()
    });

    return util.fakePromiEvent.eventEmitter;
  },

  fakeReject: function(msg){
    var error = msg || "Transaction was not mined within 50 blocks";
    util.fakePromiEvent.reject(new Error(error));
  },

  fakeNoReceipt: function(transactionHash){
    return Promise.resolve(null);
  },

  fakeGotReceipt: function(transactionHash){
    // Verify we are polling for the right hash
    if (transactionHash === util.realHash)
      return Promise.resolve(util.realReceipt)
  },

  waitMS: async function(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = util;
