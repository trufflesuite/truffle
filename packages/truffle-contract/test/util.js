var debug = require("debug")("ganache-core");
var ganache = require("ganache-core");
var Web3 = require("web3");

var log = {
  log: debug
}

var util = {

  // Spins up ganache with arbitrary options and
  // binds web3 & a contract instance to it.
  setUpProvider: function(instance, options){
    options = options || {};
    Object.assign(options, {logger: log})

    return new Promise(function(accept, reject){
      var provider = ganache.provider(options);
      var web3 = new Web3();

      web3.setProvider(provider);
      instance.setProvider(provider);

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
}

module.exports = util;
