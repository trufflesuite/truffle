const command = {
  command: "migrate",
  description: "Run migrations to deploy contracts",
  builder: {
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
    "skip-dry-run": {
      describe: "Skip the test or 'dry run' migrations",
      type: "boolean",
      default: false
    },
    "f": {
      describe: "Specify a migration number to run from",
      type: "number"
    },
    "to": {
      describe: "Specify a migration number to run to",
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
      "truffle migrate [--reset] [--f <number>] [--to <number>] " +
      "[--network <name>]\n                                [--compile-all] " +
      "[--verbose-rpc] [--interactive] [--dry-run] [--skip-dry-run]",
    options: [
      {
        option: "--reset",
        description:
          "Run all migrations from the beginning, instead of running from the last " +
          "completed migration."
      },
      {
        option: "--f <number>",
        description:
          "Run contracts from a specific migration. The number refers to the prefix of " +
          "the migration file."
      },
      {
        option: "--to <number>",
        description:
          "Run contracts to a specific migration. The number refers to the prefix of the migration file."
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
      },
      {
        option: "--dry-run",
        description: "Only perform a test or 'dry run' migration."
      },
      {
        option: "--skip-dry-run",
        description: "Do not run a test or 'dry run' migration."
      }
    ]
  },

  determineDryRunSettings: function(config, options) {
    // Source: ethereum.stackexchange.com/questions/17051
    const networkWhitelist = [
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

    let dryRunOnly, skipDryRun;
    const networkSettingsInConfig = config.networks[config.network];
    if (networkSettingsInConfig) {
      dryRunOnly =
        options.dryRun === true ||
        networkSettingsInConfig.dryRun === true ||
        networkSettingsInConfig["dry-run"] === true;
      skipDryRun =
        options.skipDryRun === true ||
        networkSettingsInConfig.skipDryRun === true ||
        networkSettingsInConfig["skip-dry-run"] === true;
    } else {
      dryRunOnly = options.dryRun === true;
      skipDryRun = options.skipDryRun === true;
    }
    const production =
      networkWhitelist.includes(parseInt(config.network_id)) ||
      config.production;
    const dryRunAndMigrations = production && !skipDryRun;
    return { dryRunOnly, dryRunAndMigrations };
  },

  prepareConfigForRealMigrations: async function(buildDir, options) {
    const Artifactor = require("truffle-artifactor");
    const Resolver = require("truffle-resolver");
    const Migrate = require("truffle-migrate");
    const Config = require("truffle-config");
    const { Environment } = require("truffle-environment");

    let accept = true;

    if (options.interactive) {
      accept = await Migrate.acceptDryRun();
    }

    if (accept) {
      const config = Config.detect(options);

      config.contracts_build_directory = buildDir;
      config.artifactor = new Artifactor(buildDir);
      config.resolver = new Resolver(config);

      try {
        await Environment.detect(config);
      } catch (error) {
        throw new Error(error);
      }

      config.dryRun = false;
      return { config, proceed: true };
    } else {
      return { proceed: false };
    }
  },

  run: function(options, done) {
    const Artifactor = require("truffle-artifactor");
    const Resolver = require("truffle-resolver");
    const Migrate = require("truffle-migrate");
    const Contracts = require("truffle-workflow-compile");
    const { Environment } = require("truffle-environment");
    const Config = require("truffle-config");
    const temp = require("temp").track();
    const { promisify } = require("util");
    const promisifiedCopy = promisify(require("../copy"));

    const conf = Config.detect(options);

    Contracts.compile(conf)
      .then(async () => {
        await Environment.detect(conf);
        const {
          dryRunOnly,
          dryRunAndMigrations
        } = command.determineDryRunSettings(conf, options);

        if (dryRunOnly) {
          conf.dryRun = true;
          await setupDryRunEnvironmentThenRunMigrations(conf);
        } else if (dryRunAndMigrations) {
          const currentBuild = conf.contracts_build_directory;
          conf.dryRun = true;

          await setupDryRunEnvironmentThenRunMigrations(conf);

          let {
            config,
            proceed
          } = await command.prepareConfigForRealMigrations(
            currentBuild,
            options
          );
          if (proceed) await runMigrations(config);
        } else {
          await runMigrations(conf);
        }
        done();
      })
      .catch(error => {
        done(error);
      });

    async function setupDryRunEnvironmentThenRunMigrations(config) {
      await Environment.fork(config);
      // Copy artifacts to a temporary directory
      const temporaryDirectory = temp.mkdirSync("migrate-dry-run-");

      await promisifiedCopy(
        config.contracts_build_directory,
        temporaryDirectory
      );

      config.contracts_build_directory = temporaryDirectory;
      // Note: Create a new artifactor and resolver with the updated config.
      // This is because the contracts_build_directory changed.
      // Ideally we could architect them to be reactive of the config changes.
      config.artifactor = new Artifactor(temporaryDirectory);
      config.resolver = new Resolver(config);

      return await runMigrations(config);
    }

    async function runMigrations(config) {
      Migrate.launchReporter();

      if (options.f) {
        await Migrate.runFrom(options.f, config);
      } else {
        const needsMigrating = await Migrate.needsMigrating(config);

        if (needsMigrating) {
          await Migrate.run(config);
        } else {
          config.logger.log("Network up to date.");
        }
      }
    }
  }
};

module.exports = command;
