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
        .filter(file => isNaN(parseInt(path.basename(file))) == false)
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
    const self = this;

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

    if (options.reset == true) {
      return this.runAll(options, callback);
    }

    self.lastCompletedMigration(options, function(err, last_migration) {
      if (err) return callback(err);

      // Don't rerun the last completed migration.
      self.runFrom(last_migration + 1, options, callback);
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

  lastCompletedMigration: function(options, callback) {
    let Migrations;

    try {
      Migrations = options.resolver.require("Migrations");
    } catch (e) {
      const message = `Could not find built Migrations contract: ${e.message}`;
      return callback(new Error(message));
    }

    if (Migrations.isDeployed() == false) {
      return callback(null, 0);
    }

    Migrations.deployed()
      .then(function(migrations) {
        // Two possible Migrations.sol's (lintable/unlintable)
        return migrations.last_completed_migration
          ? migrations.last_completed_migration.call()
          : migrations.lastCompletedMigration.call();
      })
      .then(function(completed_migration) {
        callback(null, parseInt(completed_migration));
      })
      .catch(callback);
  },

  needsMigrating: function(options, callback) {
    const self = this;

    if (options.reset == true) {
      return callback(null, true);
    }

    this.lastCompletedMigration(options, function(err, number) {
      if (err) return callback(err);

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
    });
  }
};

module.exports = Migrate;
