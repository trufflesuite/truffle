var Config = require("truffle-config");
var Contracts = require("../contracts");
var Resolver = require("truffle-resolver");
var Artifactor = require("truffle-artifactor");
var Migrate = require("truffle-migrate");
var Networks = require("../networks");
var Web3 = require("web3");

var command = {
  command: 'migrate',
  description: 'Run migrations',
  builder: {
    reset: {
      type: "boolean",
      default: false
    },
    "compile-all": {
      describe: "recompile all contracts",
      type: "boolean",
      default: false
    }
  },
  run: function (options, done) {
    var config = Config.detect(options);

    if (!config.resolver) {
      config.resolver = new Resolver(config);
    }

    if (!config.artifactor) {
      config.artifactor = new Artifactor(config.contracts_build_directory)
    }

    Contracts.compile(config, function(err) {
      if (err) return done(err);

      Networks.detectNetwork(config, function(err) {
        if (err) return done(err);

        var web3 = new Web3(config.provider);
        web3.eth.getAccounts(function(err, accounts) {
          if (err) return done(err);

          if (!config.from) {
            config.from = accounts[0];
          }

          Migrate.run(config, done);
        });
      });
    });
  }
}

module.exports = command;
