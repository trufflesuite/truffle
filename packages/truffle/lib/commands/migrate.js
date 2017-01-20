var OS = require("os");
var Config = require("truffle-config");
var Contracts = require("../contracts");
var Resolver = require("truffle-resolver");
var Artifactor = require("truffle-artifactor");
var Migrate = require("truffle-migrate");
var Environment = require("../environment");
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

      Environment.detect(config, function(err) {
        if (err) return done(err);

        Migrate.needsMigrating(config, function(err, needsMigrating) {
          if (err) return done(err);

          if (needsMigrating) {
            config.logger.log("Using network '" + config.network + "'." + OS.EOL);
            Migrate.run(config, done);
          } else {
            done();
          }
        });
      });
    });
  }
}

module.exports = command;
