const fs = require("fs");
const dir = require("node-dir");
const path = require("path");
const async = require("async");
const expect = require("truffle-expect");
const Config = require("truffle-config");
const Reporter = require("truffle-reporters").migrationsV5;
const Migration = require("./migration.js");

/**
 *  This API is consumed by `truffle-core` at the `migrate` and `test` commands via
 *  the `.runMigrations` method.
 */
const Migrate = {
  Migration: Migration,
  reporter: null,

  launchReporter: function() {
    Migrate.reporter = new Reporter();
  },

  acceptDryRun: async function() {
    return Migrate.reporter.acceptDryRun();
  },

  assemble: function(options) {
    const config = Config.detect(options);

    if (
      fs.existsSync(options.migrations_directory) &&
      fs.readdirSync(options.migrations_directory).length > 0
    ) {
      const files = dir.files(options.migrations_directory, { sync: true });
      if (!files) return [];

      options.allowed_extensions = config.migrations_file_extension_regexp;

      let migrations = files
        .filter(file => isNaN(parseInt(path.basename(file))) === false)
        .filter(
          file => path.extname(file).match(options.allowed_extensions) != null
        )
        .map(file => new Migration(file, Migrate.reporter, options));

      // Make sure to sort the prefixes as numbers and not strings.
      migrations = migrations.sort((a, b) => {
        if (a.number > b.number) return 1;
        if (a.number < b.number) return -1;
        return 0;
      });
      return migrations;
    } else {
      return [];
    }
  },

  run: async function(options, callback) {
    const callbackPassed = typeof callback === "function";
    try {
      expect.options(options, [
        "working_directory",
        "migrations_directory",
        "contracts_build_directory",
        "provider",
        "artifactor",
        "resolver",
        "network",
        "network_id",
        "logger",
        "from" // address doing deployment
      ]);

      if (options.reset === true) {
        await this.runAll(options);
        if (callbackPassed) {
          return callback();
        }
        return;
      }

      const lastMigration = await this.lastCompletedMigration(options);
      // Don't rerun the last completed migration.
      await this.runFrom(lastMigration + 1, options);
      if (callbackPassed) {
        return callback();
      }
      return;
    } catch (error) {
      if (callbackPassed) {
        return callback(error);
      }
      throw new Error(error);
    }
  },

  runFrom: async function(number, options) {
    let migrations = this.assemble(options);

    while (migrations.length > 0) {
      if (migrations[0].number >= number) break;
      migrations.shift();
    }

    if (options.to) {
      migrations = migrations.filter(
        migration => migration.number <= options.to
      );
    }

    return await this.runMigrations(migrations, options);
  },

  runAll: async function(options) {
    return await this.runFrom(0, options);
  },

  runMigrations: function(migrations, options) {
    // Perform a shallow clone of the options object
    // so that we can override the provider option without
    // changing the original options object passed in.
    const clone = {};

    Object.keys(options).forEach(key => (clone[key] = options[key]));

    if (options.quiet) {
      clone.logger = { log: function() {} };
    }

    clone.provider = this.wrapProvider(options.provider, clone.logger);
    clone.resolver = this.wrapResolver(options.resolver, clone.provider);

    // Make migrations aware of their position in sequence
    const total = migrations.length;
    if (total) {
      migrations[0].isFirst = true;
      migrations[total - 1].isLast = true;
    }

    return new Promise((resolve, reject) => {
      return async.eachSeries(
        migrations,
        (migration, finished) => {
          migration
            .run(clone)
            .then(() => {
              finished();
            })
            .catch(error => {
              finished(error);
            });
        },
        error => {
          if (error) return reject(error);
          return resolve();
        }
      );
    });
  },

  wrapProvider: function(provider) {
    return {
      send: function(payload, callback) {
        provider.send(payload, function(err, result) {
          err ? callback(err) : callback(err, result);
        });
      }
    };
  },

  wrapResolver: function(resolver, provider) {
    return {
      require: function(import_path, search_path) {
        const abstraction = resolver.require(import_path, search_path);
        abstraction.setProvider(provider);
        return abstraction;
      },
      resolve: resolver.resolve
    };
  },

  lastCompletedMigration: async function(options) {
    let Migrations;

    try {
      Migrations = options.resolver.require("Migrations");
    } catch (error) {
      const message = `Could not find built Migrations contract: ${
        error.message
      }`;
      throw new Error(message);
    }

    if (Migrations.isDeployed() === false) return 0;

    const migrationsOnChain = async (migrationsAddress, callback) => {
      return (
        (await Migrations.web3.eth.getCode(migrationsAddress, callback)) !==
        "0x"
      );
    };

    // Two possible Migrations.sol's (lintable/unlintable)
    const lastCompletedMigration = migrationsInstance => {
      try {
        return migrationsInstance.last_completed_migration.call();
      } catch (error) {
        if (error instanceof TypeError)
          return migrationsInstance.lastCompletedMigration.call();
        throw new Error(error);
      }
    };

    const migrations = await Migrations.deployed();
    let completedMigration;
    if (await migrationsOnChain(migrations.address)) {
      completedMigration = await lastCompletedMigration(migrations);
    } else {
      completedMigration = 0;
    }
    return parseInt(completedMigration);
  },

  needsMigrating: function(options) {
    return new Promise((resolve, reject) => {
      if (options.reset === true) return resolve(true);

      return this.lastCompletedMigration(options)
        .then(number => {
          const migrations = this.assemble(options);
          while (migrations.length > 0) {
            if (migrations[0].number >= number) break;
            migrations.shift();
          }

          return resolve(
            migrations.length > 1 || (migrations.length && number === 0)
          );
        })
        .catch(error => reject(error));
    });
  }
};

module.exports = Migrate;
