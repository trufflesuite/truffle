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
    },
    "interactive": {
      describe: "Manually authorize deployments after seeing a preview",
      type: "boolean",
      default: false
    },
  },
  help: {
    usage: "truffle migrate [--reset] [-f <number>] [--network <name>] [--compile-all] [--verbose-rpc] [--interactive]",
    options: [
      {
        option: "--reset",
        description: "Run all migrations from the beginning, instead of running from the last " +
          "completed migration.",
      },{
        option: "-f <number>",
        description: "Run contracts from a specific migration. The number refers to the prefix of " +
          "the migration file.",
      },{
        option: "--network <name>",
        description: "Specify the network to use, saving artifacts specific to that network. " +
          "Network name must exist\n                    in the configuration.",
      },{
        option: "--compile-all",
        description: "Compile all contracts instead of intelligently choosing which contracts need to " +
          "be compiled.",
      },{
        option: "--verbose-rpc",
        description: "Log communication between Truffle and the Ethereum client."
      },{
        option: "--interactive",
        description: "Prompt to confirm that the user wants to proceed after the dry run.",
      },
    ]
  },
  run: function (options, done) {
    var Config = require("truffle-config");
    var Contracts = require("truffle-workflow-compile");
    var Resolver = require("truffle-resolver");
    var Artifactor = require("truffle-artifactor");
    var Migrate = require("truffle-migrate");
    var Environment = require("../environment");
    var NPMDependencies = require("../npmdeps");
    var temp = require("temp");
    var async = require("async");
    var copy = require("../copy");

    // Source: ethereum.stackexchange.com/questions/17051
    var networkWhitelist = [
      1, // Mainnet (ETH & ETC)
      2, // Morden (ETC)
      3, // Ropsten
      4, // Rinkeby
      8, // Ubiq
     42, // Kovan (Parity)
     77, // Sokol
     99, // Core

     7762959, // Musiccoin
     61717561 // Aquachain
    ];

    function setupDryRunEnvironmentAndRunAllMigrations(rootConfig, configs, callback) {
      return new Promise((resolve, reject) => {
        Environment.fork(rootConfig, function(err) {
          if (err) return reject(err);

          function cleanup() {
            var args = arguments;

            // Ensure directory cleanup.
            temp.cleanup(function(err) {
              (args.length && args[0] !== null)
                ? reject(args[0])
                : resolve();
            });
          };

          // Copy artifacts to a temporary directory
          async.eachSeries(configs, function(config, cb2) {
            temp.mkdir('migrate-dry-run-', function(err, temporaryDirectory) {
              if (err) return cb2(err);

              copy(config.contracts_build_directory, temporaryDirectory, function(err) {
                if (err) return cb2(err);

                config.contracts_build_directory = temporaryDirectory;

                // Note: Create a new artifactor and resolver with the updated config.
                // This is because the contracts_build_directory changed.
                // Ideally we could architect them to be reactive of the config changes.
                config.artifactor = new Artifactor(temporaryDirectory);
                config.resolver = new Resolver(config);

                runMigrations(config, cb2);
              });
            });
          }, cleanup);
        });
      });
    }

    function runMigrations(config, callback) {
      Migrate.launchReporter();

      if (options.f) {
        Migrate.runFrom(options.f, config, callback);
      } else {
        Migrate.needsMigrating(config, function(err, needsMigrating) {
          if (err) return callback(err);

          if (needsMigrating) {
            Migrate.run(config, callback);
          } else {
            logger.log("Network up to date.")
            callback();
          }
        });
      }
    };

    async function executePostDryRunMigration(config, buildDir, callback){
      let accept = true;

      if (options.interactive){
        accept = await Migrate.acceptDryRun();
      }

      if (accept){
        const environment = require('../environment');
        const NewConfig = require('truffle-config');
        const config = NewConfig.detect(options);

        config.contracts_build_directory = buildDir;
        config.artifactor = new Artifactor(buildDir);
        config.resolver = new Resolver(config);

        environment.detect(config, function(err) {
          config.dryRun = false;
          runMigrations(config, callback);
        });
      } else {
        callback();
      }
    }

    var rootConfig = Config.detect(options);
    var logger = rootConfig.logger;

    var migrationConfigs = NPMDependencies.detect(rootConfig, options);

    async.eachSeries(migrationConfigs, Environment.detect, function(err) {
      if (err) return done(err);

      async.eachSeries(migrationConfigs, function(config, callback) {
        // async's introspection trips on Contracts.compile's variate signature
        // so we explicitly pass through these params
        Contracts.compile(config, callback);
      }, async function(err) {
        if (err) return done(err);

        var dryRun = options.dryRun === true;
        var production = networkWhitelist.includes(rootConfig.network_id) || rootConfig.production;

        // Dry run only
        if (dryRun) {
          try {
            await setupDryRunEnvironmentAndRunAllMigrations(rootConfig, migrationConfigs);
            done();
          } catch(err){
            done(err);
          };

        // Production: dry-run then real run
        } else if (production && !conf.skipDryRun) {

          const currentBuild = rootConfig.contracts_build_directory;
          rootConfig.dryRun = true;

          try {
            await setupDryRunEnvironmentAndRunAllMigrations(rootConfig, migrationConfigs);
          } catch(err){
            return done(err);
          };

          async.eachSeries(migrationConfigs, function(config, callback){
            executePostDryRunMigration(config, currentBuild, callback);
          }, done);

        // Development
        } else {
          async.eachSeries(migrationConfigs, runMigrations, done);
        }
      });
    });
  }
};


module.exports = command;