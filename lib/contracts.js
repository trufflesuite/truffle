var async = require("async");
var fs = require("fs");
var mkdirp = require("mkdirp");
var path = require("path");
var solc = require("solc");
var path = require("path");
var Compiler = require("./compiler");
var Exec = require("./exec");
var Pudding = require("ether-pudding");
var DeployError = require("./errors/deployerror");
var graphlib = require("graphlib");
var Graph = require("graphlib").Graph;
var isAcyclic = require("graphlib/lib/alg").isAcyclic;
var postOrder = require("graphlib/lib/alg").postorder;
var requireNoCache = require("./require-nocache");

var Contracts = {
  account: null,

  get_account: function(config, callback) {
    var self = this;

    if (config.app.resolved.rpc.from != null) {
      this.account = config.app.resolved.rpc.from;
    }

    if (this.account != null) {
      return callback(null, this.account);
    }

    config.web3.eth.getAccounts(function(err, result) {
      if (err != null) return callback(err);

      self.account = result[0];
      callback(null, self.account);
    });
  },

  // source_directory: String. Directory where .sol files can be found.
  // build_directory: String. Directory where .sol.js files can be found and written to.
  // all: Boolean. Compile all sources found. Defaults to true. If false, will compare sources against built files
  //      in the build directory to see what needs to be compiled.
  // network_id: network id to link saved contract artifacts.
  // quiet: Boolean. Suppress output. Defaults to false.
  // strict: Boolean. Return compiler warnings as errors. Defaults to false.
  compile: function(options, callback) {
    var self = this;

    function finished(err, contracts) {
      if (err) return callback(err);
      if (contracts != null && Object.keys(contracts).length > 0) {
        self.write_contracts(contracts, options, callback);
      } else {
        callback();
      }
    };

    if (options.all == false) {
      Compiler.compile_necessary(options, finished);
    } else {
      Compiler.compile_all(options, finished);
    }
  },

  after_deploy: function(config, done) {
    async.eachSeries(config.app.resolved.after_deploy, function(file, iterator_callback) {
      if (config.argv.quietDeploy == null) {
        console.log("Running post deploy script " + file + "...");
      }
      Exec.file(config, file, iterator_callback);
    }, done);
  },

  write_contracts: function(contracts, options, callback) {
    mkdirp(options.build_directory, function(err, result) {
      if (err != null) {
        callback(err);
        return;
      }

      if (options.quiet != true) {
        console.log("Writing artifacts to ." + path.sep + path.relative(process.cwd(), options.build_directory));
      }

      Pudding.saveAll(contracts, options.build_directory, options).then(callback).catch(callback);
    });
  }
}

module.exports = Contracts;
