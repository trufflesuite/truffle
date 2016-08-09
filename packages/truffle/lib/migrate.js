

var fs = require("fs");
var dir = require("node-dir");
var path = require("path");
var Contracts = require("./contracts");
var Pudding = require("ether-pudding");
var Deployer = require("./deployer");
var Profiler = require("./profiler");
var Provider = require("./provider");
var Require = require("./require");
var async = require("async");
var Web3 = require("web3");
var expect = require("./expect");

function Migration(file) {
  this.file = path.resolve(file);
  this.number = parseInt(path.basename(file));
};

Migration.prototype.run = function(options, contracts, callback) {
  var self = this;
  var logger = options.logger || console;

  if (options.quiet) {
    logger = {
      log: function() {}
    }
  };

  var web3 = new Web3();
  web3.setProvider(options.provider);

  logger.log("Running migration: " + path.relative(options.migrations_directory, this.file));

  // Initial context.
  var context = {
    web3: web3
  };

  // Add contracts to context and prepare contracts.
  contracts.forEach(function(contract) {
    context[contract.contract_name] = contract;

    // During migrations, we could be on a network that takes a long time to accept
    // transactions (i.e., contract deployment close to block size). Because successful
    // migration is more important than wait time in those cases, we'll synchronize "forever".
    contract.synchronization_timeout = 0;

    if (options.rpc) {
      var defaults = {
        gas: options.rpc.gas || undefined,
        gasPrice: options.rpc.gasPrice || undefined,
        from: options.rpc.from || undefined
      };

      // Apparently web3 is super strict in whether or not the from key exists.
      if (defaults.from == null) {
        delete defaults.from;
      }

      contract.defaults(defaults);
    }
  });

  var deployer = new Deployer({
    logger: {
      log: function(msg) {
        logger.log("  " + msg);
      }
    },
    contracts: contracts,
    network: options.network,
    network_id: options.network_id,
    provider: options.provider,
    basePath: path.dirname(this.file)
  });

  var finish = function(err) {
    if (err) return callback(err);
    deployer.start().then(function() {
      if (options.save === false) return;
      logger.log("Saving successful migration to network...");
      var Migrations = context["Migrations"];
      if (Migrations && Migrations.address) {
        return Migrations.deployed().setCompleted(self.number);
      }
    }).then(function() {
      if (options.save === false) return;
      logger.log("Saving artifacts...");
      return Pudding.saveAll(contracts, options.contracts_build_directory, options);
    }).then(function() {
      callback();
    }).catch(function(e) {
      logger.log("Error encountered, bailing. Network state unknown. Review successful transactions manually.");
      callback(e);
    });
  };

  Require.file({
    file: self.file,
    context: context,
    args: [deployer]
  }, function(err, fn) {
    if (!fn || !fn.length || fn.length == 0) {
      return callback(new Error("Migration " + self.file + " invalid or does not take any parameters"));
    }
    if (fn.length == 1 || fn.length == 2) {
      fn(deployer, options.network);
      finish();
    } else if (fn.length == 3) {
      fn(deployer, options.network, finish);
    }
  });
};

var Migrate = {
  Migration: Migration,

  assemble: function(options, callback) {
    dir.files(options.migrations_directory, function(err, files) {
      if (err) return callback(err);

      var migrations = files.map(function(file) {
        return new Migration(file, options.network);
      });

      // Make sure to sort the prefixes as numbers and not strings.
      migrations = migrations.sort(function(a, b) {
        if (a.number > b.number) {
          return 1;
        } else if (a.number < b.number) {
          return -1;
        }
        return 0;
      });

      callback(null, migrations);
    });
  },

  run: function(options, callback) {
    var self = this;

    expect.options(options, [
      "migrations_directory",
      "contracts_build_directory",
      "provider",
      "network",
      "network_id"
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
    var self = this;

    this.assemble(options, function(err, migrations) {
      if (err) return callback(err);

      while (migrations.length > 0) {
        if (migrations[0].number >= number) {
          break;
        }

        migrations.shift();
      }

      if (options.to) {
        migrations = migrations.filter(function(migration) {
          return migration.number <= options.to;
        });
      }

      self.runMigrations(migrations, options, callback);
    });
  },

  runAll: function(options, callback) {
    this.runFrom(0, options, callback);
  },

  runMigrations: function(migrations, options, callback) {
    Contracts.provision(options, function(err, contracts) {
      if (err) return callback(err);

      if (options.reset == true) {
        contracts.forEach(function(contract) {
          contract.address = null;
        })
      }

      async.eachSeries(migrations, function(migration, finished) {
        migration.run(options, contracts, function(err) {
          if (err) return finished(err);
          finished();
        });
      }, callback);
    });
  },

  lastCompletedMigration: function(options, callback) {
    var migrations_contract = path.resolve(path.join(options.contracts_build_directory, "Migrations.sol.js"));

    Pudding.requireFile(migrations_contract, options, function(err, Migrations) {
      if (err) return callback(new Error("Could not find built Migrations contract."));

      if (Migrations.address == null) {
        return callback(null, 0);
      }

      Migrations.setProvider(options.provider);

      var migrations = Migrations.deployed();

      migrations.last_completed_migration.call().then(function(completed_migration) {
        callback(null, completed_migration.toNumber());
      }).catch(callback);
    });
  }
};

module.exports = Migrate;
