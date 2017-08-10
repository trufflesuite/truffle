var command = {
  command: 'migrate',
  description: 'Run migrations to deploy contracts',
  builder: {
    reset: {
      type: "boolean",
      default: false
    },
    "compile-all": {
      describe: "recompile all contracts",
      type: "boolean",
      default: false
    },
    "dry-run": {
      describe: "Run migrations against an in-memory fork, for testing",
      type: "boolean",
      default: false
    },
    f: {
      describe: "Specify a migration number to run from",
      type: "number"
    }
  },
  run: function (options, done) {
    var OS = require("os");
    var Ganache = require("ganache-core");
    var Config = require("truffle-config");
    var Contracts = require("../contracts");
    var Resolver = require("truffle-resolver");
    var Artifactor = require("truffle-artifactor");
    var Migrate = require("truffle-migrate");
    var Environment = require("../environment");

    var config = Config.detect(options);
    if (options["dry-run"]) {
      var upstreamNetwork = config.network || "development";
      var upstreamConfig = config.networks[upstreamNetwork];
      config.network = upstreamNetwork + "-fork";
      config.networks[config.network] = {
        network_id: upstreamConfig.network_id,
        provider: Ganache.provider({
          fork: "http://" + upstreamConfig.host + ":" + upstreamConfig.port
        })
      }
    }

    Contracts.compile(config, function(err) {
      if (err) return done(err);

      Environment.detect(config, function(err) {
        if (err) return done(err);

        config.logger.log("Using network '" + config.network + "'." + OS.EOL);

        if (options.f) {
          Migrate.runFrom(options.f, config, done);
        } else {
          Migrate.needsMigrating(config, function(err, needsMigrating) {
            if (err) return done(err);

            if (needsMigrating) {
              Migrate.run(config, done);
            } else {
              config.logger.log("Network up to date.")
              done();
            }
          });
        }
      });
    });
  }
}

module.exports = command;
