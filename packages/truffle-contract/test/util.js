var debug = require("debug")("ganache-core");
var ganache = require("ganache-core");
var Web3 = require("web3");
var Web3PromiEvent = require('web3-core-promievent');

var log = {
  log: debug
}

var util = {

  web3: null,
  fakePromiEvent: null,
  fakeReceipt: null,
  realHash: null,
  realReceipt: null,

  // Spins up ganache with arbitrary options and
  // binds web3 & a contract instance to it.
  setUpProvider: function(instance, options){
    options = options || {};
    Object.assign(options, {logger: log, ws: true})

    return new Promise(function(accept, reject){
      var provider = ganache.provider(options);
      var web3 = new Web3();

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
}

module.exports = util;
