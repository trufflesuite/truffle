var command = {
  command: "migrate",
  description: "Run migrations to deploy contracts",
  builder: {
    "legacy": {
      describe: "Run legacy migrations",
      type: "boolean",
      default: false
    },
    "reset": {
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
    "f": {
      describe: "Specify a migration number to run from",
      type: "number"
    },
    "interactive": {
      describe: "Manually authorize deployments after seeing a preview",
      type: "boolean",
      default: false
    }
  },
  help: {
    usage:
      "truffle migrate [--legacy] [--reset] [-f <number>] [--network <name>] [--compile-all] [--verbose-rpc] [--interactive]",
    options: [
      {
        option: "--legacy",
        description: "Run legacy migrations"
      },
      {
        option: "--reset",
        description:
          "Run all migrations from the beginning, instead of running from the last " +
          "completed migration."
      },
      {
        option: "-f <number>",
        description:
          "Run contracts from a specific migration. The number refers to the prefix of " +
          "the migration file."
      },
      {
        option: "--network <name>",
        description:
          "Specify the network to use, saving artifacts specific to that network. " +
          "Network name must exist\n                    in the configuration."
      },
      {
        option: "--compile-all",
        description:
          "Compile all contracts instead of intelligently choosing which contracts need to " +
          "be compiled."
      },
      {
        option: "--verbose-rpc",
        description:
          "Log communication between Truffle and the Ethereum client."
      },
      {
        option: "--interactive",
        description:
          "Prompt to confirm that the user wants to proceed after the dry run."
      }
    ]
  },
  run: function(options, done) {
    const debug = require("debug")("lib:commands:migrate"); // eslint-disable-line no-unused-vars
    var Config = require("truffle-config");
    var Contracts = require("truffle-workflow-compile");
    var Resolver = require("truffle-resolver");
    var Artifactor = require("truffle-artifactor");
    const Migrate = options.legacy
      ? require("truffle-migrate-legacy")
      : require("truffle-migrate");
    var Environment = require("../environment");
    var temp = require("temp");
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

    function setupDryRunEnvironmentThenRunMigrations(config) {
      return new Promise((resolve, reject) => {
        Environment.fork(config, function(err) {
          if (err) return reject(err);

          // Copy artifacts to a temporary directory
          temp.mkdir("migrate-dry-run-", function(err, temporaryDirectory) {
            if (err) return reject(err);

            function cleanup() {
              var args = arguments;

              // Ensure directory cleanup.
              temp.cleanup(() => {
                args.length && args[0] !== null ? reject(args[0]) : resolve();
              });
            }

            copy(config.contracts_build_directory, temporaryDirectory, function(
              err
            ) {
              if (err) return cleanup(err);

              config.contracts_build_directory = temporaryDirectory;

              // Note: Create a new artifactor and resolver with the updated config.
              // This is because the contracts_build_directory changed.
              // Ideally we could architect them to be reactive of the config changes.
              config.artifactor = new Artifactor(temporaryDirectory);
              config.resolver = new Resolver(config);

              runMigrations(config, cleanup);
            });
          });
        });
      });
    }

    function runMigrations(config, callback) {
      if (!options.legacy) {
        Migrate.launchReporter();
      }

      if (options.f) {
        Migrate.runFrom(options.f, config, callback);
      } else {
        Migrate.needsMigrating(config, function(err, needsMigrating) {
          if (err) return callback(err);

          if (needsMigrating) {
            Migrate.run(config, callback);
          } else {
            config.logger.log("Network up to date.");
            callback();
          }
        });
      }
    }

    async function executePostDryRunMigration(buildDir) {
      let accept = true;

      if (options.interactive) {
        accept = await Migrate.acceptDryRun();
      }

      if (accept) {
        const environment = require("../environment");
        const NewConfig = require("truffle-config");
        const config = NewConfig.detect(options);

        config.contracts_build_directory = buildDir;
        config.artifactor = new Artifactor(buildDir);
        config.resolver = new Resolver(config);

        environment.detect(config, () => {
          config.dryRun = false;
          runMigrations(config, done);
        });
      } else {
        done();
      }
    }

    async function orchestrateMigrations(config) {
      var dryRun = options.dryRun === true;
      // Dry run only
      if (dryRun) {
        try {
          await setupDryRunEnvironmentThenRunMigrations(conf);
          return done();
        } catch (err) {
          return done(err);
        }
      }

      var production =
        networkWhitelist.includes(config.network_id) || config.production;

      // Production: dry-run then real run
      if (production && !config.skipDryRun) {
        const currentBuild = config.contracts_build_directory;
        config.dryRun = true;

        try {
          await setupDryRunEnvironmentThenRunMigrations(config);
        } catch (err) {
          return done(err);
        }

        executePostDryRunMigration(currentBuild);

        // Development
      } else {
        runMigrations(config, done);
      }
    }

    async function orchestrateLegacyMigrations(config) {
      var dryRun = options.dryRun === true;

      var networkMessage = "Using network '" + config.network + "'";

      if (dryRun) {
        networkMessage += " (dry run)";
      }

      config.logger.log(networkMessage + ".");
      config.logger.log();

      if (dryRun) {
        await setupDryRunEnvironmentThenRunMigrations(config);
      } else {
        runMigrations(config, done);
      }
    }

    const conf = Config.detect(options);

    Contracts.compile(conf, function(err) {
      if (err) return done(err);

      Environment.detect(conf, async function(err) {
        if (err) return done(err);

        if (options.legacy) {
          debug("legacy migrations");
          await orchestrateLegacyMigrations(conf);
        } else {
          await orchestrateMigrations(conf);
        }
      });
    });
  }
};

module.exports = command;
