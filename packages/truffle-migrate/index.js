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

  assemble: function(options, callback) {
    var config = Config.detect(options);
    dir.files(options.migrations_directory, function(err, files) {
      if (err) return callback(err);

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

      callback(null, migrations);
    });
  },

  run: function(options, callback) {
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
      return this.runAll(options, callback);
    }

    return this.lastCompletedMigration(options)
      .then(lastMigration => {
        // Don't rerun the last completed migration.
        return this.runFrom(lastMigration + 1, options, callback);
      })
      .catch(error => {
        return callback(error);
      });
  },

  runFrom: function(number, options, callback) {
    const self = this;

    this.assemble(options, function(err, migrations) {
      if (err) return callback(err);

      while (migrations.length > 0) {
        if (migrations[0].number >= number) break;
        migrations.shift();
      }

      if (options.to) {
        migrations = migrations.filter(
          migration => migration.number <= options.to
        );
      }

      self.runMigrations(migrations, options, callback);
    });
  },

  runAll: function(options, callback) {
    this.runFrom(0, options, callback);
  },

  runMigrations: function(migrations, options, callback) {
    // Perform a shallow clone of the options object
    // so that we can override the provider option without
    // changing the original options object passed in.
    const clone = {};

    Object.keys(options).forEach(function(key) {
      clone[key] = options[key];
    });

    if (options.quiet) {
      clone.logger = {
        log: function() {}
      };
    }

    clone.provider = this.wrapProvider(options.provider, clone.logger);
    clone.resolver = this.wrapResolver(options.resolver, clone.provider);

    // Make migrations aware of their position in sequence
    const total = migrations.length;
    if (total) {
      migrations[0].isFirst = true;
      migrations[total - 1].isLast = true;
    }

    async.eachSeries(
      migrations,
      function(migration, finished) {
        migration.run(clone, function(err) {
          if (err) return finished(err);
          finished();
        });
      },
      callback
    );
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

  needsMigrating: function(options, callback) {
    const self = this;

    if (options.reset === true) {
      return callback(null, true);
    }

    return this.lastCompletedMigration(options)
      .then(number => {
        self.assemble(options, function(err, migrations) {
          if (err) return callback(err);

          while (migrations.length > 0) {
            if (migrations[0].number >= number) break;
            migrations.shift();
          }

          callback(
            null,
            migrations.length > 1 || (migrations.length && number === 0)
          );
        });
      })
      .catch(error => {
        return callback(error);
      });
  }
};

module.exports = Migrate;
