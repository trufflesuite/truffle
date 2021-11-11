const fs = require("fs");
const path = require("path");
const glob = require("glob");
const expect = require("@truffle/expect");
const Config = require("@truffle/config");
const Migration = require("./Migration");

/**
 *  This API is consumed by `@truffle/core` at the `migrate` and `test` commands via
 *  the `.runMigrations` method.
 */
const Migrate = {
  Migration: Migration,
  logger: null,

  launchReporter: function (config) {
    config.events.emit("migrate:start", {
      config,
    });
  },

  acceptDryRun: async function () {
    // TODO: extract interactive stuff from reporters
    return Migrate.reporter.acceptDryRun();
  },

  assemble: function (options) {
    const config = Config.detect(options);
    if (
      !fs.existsSync(config.migrations_directory) ||
      !fs.readdirSync(config.migrations_directory).length > 0
    ) {
      return [];
    }

    const migrationsDir = config.migrations_directory;
    const directoryContents = glob.sync(`${migrationsDir}${path.sep}*`);
    const files = directoryContents.filter(item => fs.statSync(item).isFile());

    if (files.length === 0) return [];

    let migrations = files
      .filter(file => isNaN(parseInt(path.basename(file))) === false)
      .filter(
        file =>
          path.extname(file).match(config.migrations_file_extension_regexp) !=
          null
      )
      .map(file => new Migration(file, config));

    // Make sure to sort the prefixes as numbers and not strings.
    migrations = migrations.sort((a, b) => {
      if (a.number > b.number) return 1;
      if (a.number < b.number) return -1;
      return 0;
    });
    return migrations;
  },

  run: async function (options, callback) {
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
        "from", // address doing deployment
      ]);

      if (options.reset === true) {
        await this.runAll(options);
        if (callbackPassed) return callback();
        return;
      }

      const lastMigration = await this.lastCompletedMigration(options);

      // Don't rerun the last completed migration.
      await this.runFrom(lastMigration + 1, options);

      if (callbackPassed) return callback();
      return;
    } catch (error) {
      if (callbackPassed) return callback(error);
      throw error;
    }
  },

  runFrom: async function (number, options) {
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

  runAll: async function (options) {
    return await this.runFrom(0, options);
  },

  runMigrations: async function (migrations, options) {
    // Perform a shallow clone of the options object
    // so that we can override the provider option without
    // changing the original options object passed in.
    const clone = {};

    Object.keys(options).forEach(key => (clone[key] = options[key]));

    if (options.quiet) clone.logger = { log: function () {} };

    clone.resolver = this.wrapResolver(options.resolver, clone.provider);

    // Make migrations aware of their position in sequence
    const total = migrations.length;
    if (total) {
      migrations[0].isFirst = true;
      migrations[total - 1].isLast = true;
    }

    if (options.events) {
      options.events.emit("migrate:preAllMigrations", {
        migrations,
        dryRun: options.dryRun
      });
    }

    try {
      global.artifacts = clone.resolver;
      global.config = clone;
      for (const migration of migrations) {
        await migration.run(clone);
      }

      if (options.events) {
        await options.events.emit("migrate:postAllMigrations", {
          dryRun: options.dryRun,
          error: null,
        });
      }
      return;
    } catch (error) {
      if (options.events) {
        await options.events.emit("migrate:postAllMigrations", {
          dryRun: options.dryRun,
          error: error.toString(),
        });
      }
      throw error;
    } finally {
      delete global.artifacts;
      delete global.config;
    }
  },

  wrapResolver: function (resolver, provider) {
    return {
      require: function (import_path, search_path) {
        const abstraction = resolver.require(import_path, search_path);
        abstraction.setProvider(provider);
        return abstraction;
      },
      resolve: resolver.resolve,
    };
  },

  lastCompletedMigration: async function (options) {
    let Migrations;

    try {
      Migrations = options.resolver.require("Migrations");
    } catch (error) {
      // don't throw, Migrations contract optional
      return 0;
    }

    if (Migrations.isDeployed() === false) return 0;

    const migrationsOnChain = async migrationsAddress => {
      return (
        (await Migrations.interfaceAdapter.getCode(migrationsAddress)) !== "0x"
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

  needsMigrating: function (options) {
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
  },
};

module.exports = Migrate;
