const fs = require("fs");
const dir = require("node-dir");
const path = require("path");
const ResolverIntercept = require("./resolverintercept");
const Require = require("truffle-require");
const async = require("async");
const Web3 = require("web3");
const expect = require("truffle-expect");
const Deployer = require("truffle-deployer");

class Migration {

  constructor(file){
    this.file = path.resolve(file);
    this.number = parseInt(path.basename(file))
  }

  async run(options, callback) {
    const self = this;
    const logger = options.logger;
    const resolver = new ResolverIntercept(options.resolver);
    const web3 = new Web3();
    web3.setProvider(options.provider);

    logger.log("Running migration: " + path.relative(options.migrations_directory, this.file));

    // Initial context.
    const context = {
      web3: web3
    };

    const deployer = new Deployer({
      logger: {
        log: function(msg) {
          logger.log("  " + msg);
        }
      },
      network: options.network,
      network_id: options.network_id,
      provider: options.provider,
      basePath: path.dirname(this.file)
    });

    const finish = async function(err) {
      if (err) return callback(err);

      try {
        await deployer.start();

        if (options.save === false) return;

        const Migrations = resolver.require("./Migrations.sol");

        if (Migrations && Migrations.isDeployed()) {
          logger.log("Saving successful migration to network...");
          const migrations = await Migrations.deployed();
          await migrations.setCompleted(self.number);
        }

        logger.log("Saving artifacts...");
        await options.artifactor.saveAll(resolver.contracts());

        // Use process.nextTicK() to prevent errors thrown in the
        // callback from triggering the below catch()
        process.nextTick(callback);
      } catch(e) {
        logger.log("Error encountered, bailing. Review successful transactions manually.");
        callback(e);
      };
    };

    try {
      const accounts = await web3.eth.getAccounts();
      const requireOptions = {
        file: self.file,
        context: context,
        resolver: resolver,
        args: [deployer],
      }

      Require.file(requireOptions, (err, fn) => {
        if (err) return callback(err);

        const unRunnable = !fn || !fn.length || fn.length == 0;

        if (unRunnable){
          const msg = `Migration ${self.file} invalid or does not take any parameters`;
          return callback(new Error(msg));
        }

        fn(deployer, options.network, accounts);
        finish();
      });

    } catch(err){
      callback(err)
    }
  }
}

const Migrate = {
  Migration: Migration,

  assemble: function(options, callback) {
    dir.files(options.migrations_directory, function(err, files) {
      if (err) return callback(err);

      options.allowed_extensions = options.allowed_extensions || /^\.(js|es6?)$/;

      let migrations = files
        .filter(file => isNaN(parseInt(path.basename(file))) == false)
        .filter(file => path.extname(file).match(options.allowed_extensions) != null)
        .map(file => new Migration(file, options.network));

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
      "from", // address doing deployment
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
        migrations = migrations.filter(migration => migration.number <= options.to);
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
      }
    };

    clone.provider = this.wrapProvider(options.provider, clone.logger);
    clone.resolver = this.wrapResolver(options.resolver, clone.provider);

    async.eachSeries(migrations, function(migration, finished) {
      migration.run(clone, function(err) {
        if (err) return finished(err);
        finished();
      });
    }, callback);
  },

  wrapProvider: function(provider, logger) {
    const printTransaction = function(tx_hash) {
      logger.log("  ... " + tx_hash);
    };

    return {
      send: function(payload, callback) {
        provider.send(payload, function(err, result) {
          if (err) return callback(err);

          if (payload.method == "eth_sendTransaction") {
            printTransaction(result.result);
          }

          callback(err, result);
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
    }
  },

  lastCompletedMigration: function(options, callback) {
    let Migrations;

    try {
      Migrations = options.resolver.require("Migrations");
    } catch (e) {
      return callback(new Error("Could not find built Migrations contract: " + e.message));
    }

    if (Migrations.isDeployed() == false) {
      return callback(null, 0);
    }

    const migrations = Migrations.deployed();

    Migrations.deployed().then(function(migrations) {
      // Two possible Migrations.sol's (lintable/unlintable)
      return (migrations.last_completed_migration)
        ? migrations.last_completed_migration.call()
        : migrations.lastCompletedMigration.call();

    }).then(function(completed_migration) {
      callback(null, parseInt(completed_migration));
    }).catch(callback);
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

        callback(null, migrations.length > 1);
      });
    });
  }
};

module.exports = Migrate;
