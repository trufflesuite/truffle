var debug = require("debug")("ganache-core");
var ganache = require("ganache-core");
var Web3 = require("web3");

var log = {
  log: debug
}

var util = {

  web3: null,

  // Spins up ganache with arbitrary options and
  // binds web3 & a contract instance to it.
  setUpProvider: function(instance, options){
    options = options || {};
    Object.assign(options, {logger: log, network_id: 10, ws: true})

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
  }
}

module.exports = util;
