var fs = require("fs");
var dir = require("node-dir");
var path = require("path");
var Pudding = require("ether-pudding");
var Deployer = require("./deployer");
var Profiler = require("./profiler");
var Require = require("./exec");
var async = require("async");
var Web3 = require("web3");

function Migration(file) {
  this.file = file;
  this.number = parseInt(path.basename(file));
};

Migration.prototype.run = function(options, callback) {
  var self = this;

  var web3 = new Web3();
  web3.setProvider(options.provider);

  console.log("Running migration: " + path.relative(options.migrations_directory, this.file));

  Pudding.requireAll({
    source_directory: options.contracts_directory,
    provider: options.provider || (options.web3 != null ? options.web3.currentProvider : null)
  }, function(err, contracts) {
    if (err) return callback(err);

    web3.eth.getAccounts(function(err, accounts) {
      if (err) return callback(err);

      var context = {
        web3: web3
      };

      contracts.forEach(function(contract) {
        context[contract.contract_name] = contract;
        contract.defaults({
          from: accounts[0]
        });
      });

      var deployer = new Deployer({
        logger: {
          log: function(msg) {
            console.log("  " + msg);
          }
        },
        contracts: contracts
      });

      var finish = function(err) {
        if (err) return callback(err);
        deployer.start().then(callback).catch(callback);
      };

      Require.file({
        file: self.file,
        context: context,
        args: [deployer]
      }, function(err, fn) {
        if (fn.length <= 1) {
          fn(deployer);
          finish();
        } else {
          fn(deployer, finish);
        }
      });
    });
  });
};

var Migrate = {
  Migration: Migration,

  assemble: function(options, callback) {
    dir.files(options.migrations_directory, function(err, files) {
      if (err) return callback(err);

      var migrations = files.map(function(file) {
        return new Migration(file);
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

  runAll: function(options, callback) {
    var self = this;
    this.assemble(options, function(err, migrations) {
      if (err) return callback(err);

      async.eachSeries(migrations, function(migration, finished) {
        migration.run(options, finished);
      }, callback);
    });
  }
};

module.exports = Migrate;
