var Mocha = require("mocha");
var chai = require("chai");
var dir = require("node-dir");
var path = require("path");
var fs = require("fs");
var Web3 = require("web3");
var Contracts = require("./contracts");
var Migrate = require('./migrate');
var Pudding = require("ether-pudding");
var ExtendableError = require("./errors/extendableerror");
var SolidityCoder = require("web3/lib/solidity/coder.js");
var expect = require("./expect");

chai.use(require("./assertions"));

var BEFORE_TIMEOUT = 120000;
var TEST_TIMEOUT = 300000;

function TestRunner(options) {
  this.options = options;
  this.logger = options.logger || console;
  this.provider = options.provider;
  this.can_shapshot = false;
  this.initial_snapshot = null;
  this.known_events = {};
  this.web3 = new Web3();
  this.web3.setProvider(options.provider);
  this.contracts = [];

  // For each test
  this.currentTestStartBlock = null;
};

TestRunner.prototype.initialize = function(callback) {
  var self = this;

  var afterStateReset = function(err) {
    if (err) return callback(err);

    Contracts.provision(self.options, function(err, contracts) {
      if (err) return callback(err);

      self.contracts = contracts;
      self.known_events = {};

      // Go through all abis and record events we know about.
      self.contracts.forEach(function(contract) {
        // make the contract globally available
        global[contract.contract_name] = contract;

        var abi = contract.abi;

        for (var j = 0; j < abi.length; j++) {
          var item = abi[j];

          if (item.type == "event") {
            var signature = item.name + "(" + item.inputs.map(function(param) {return param.type;}).join(",") + ")";

            self.known_events[web3.sha3(signature)] = {
              signature: signature,
              abi_entry: item
            };
          }
        }
      });

      callback();
    });
  };

  if (self.initial_snapshot == null) {
    // Make the initial deployment (full migration).
    self.deploy(function(err) {
      if (err) return callback(err);

      self.snapshot(function(err, initial_snapshot) {
        if (err == null) {
          self.can_snapshot = true;
          self.initial_snapshot = initial_snapshot;
        }
        afterStateReset();
      });
    });
  } else {
    self.resetState(afterStateReset);
  }
};

TestRunner.prototype.deploy = function(callback) {
  Migrate.run({
    migrations_directory: this.options.migrations_directory,
    contracts_build_directory: this.options.contracts_build_directory,
    network: this.options.network,
    network_id: this.options.network_id,
    provider: this.options.provider,
    rpc: this.options.rpc,
    reset: true,
    quiet: true
  }, callback);
};

TestRunner.prototype.resetState = function(callback) {
  var self = this;
  if (this.can_snapshot) {
    this.revert(this.initial_snapshot, function(err) {
      if (err) return callback(err);
      self.snapshot(function(err, snapshot) {
        if (err) return callback(err);
        self.initial_snapshot = snapshot;
        callback();
      });
    });
  } else {
    this.deploy(callback);
  }
};

TestRunner.prototype.startTest = function(mocha, callback) {
  var self = this;
  this.web3.eth.getBlockNumber(function(err, result) {
    if (err) return callback(err);

    result = web3.toBigNumber(result);

    // Add one in base 10
    self.currentTestStartBlock = result.plus(1, 10);

    callback();
  });
};

TestRunner.prototype.endTest = function(mocha, callback) {
  var self = this;

  if (mocha.currentTest.state != "failed") {
    return callback();
  }

  var logs = [];

  // There's no API for eth_getLogs?
  this.rpc("eth_getLogs", [{
    fromBlock: "0x" + this.currentTestStartBlock.toString(16)
  }], function(err, result) {
    if (err) return callback(err);

    var logs = result.result;

    if (logs.length == 0) {
      self.logger.log("    > No events were emitted");
      return callback();
    }

    self.logger.log("\n    Events emitted during test:");
    self.logger.log(  "    ---------------------------");
    self.logger.log("");

    logs.forEach(function(log) {
      var event = self.known_events[log.topics[0]];

      if (event == null) {
        return;
      }

      var types = event.abi_entry.inputs.map(function(input) {
        return input.indexed == true ? null : input.type;
      }).filter(function(type) {
        return type != null;
      });
      var values = SolidityCoder.decodeParams(types, log.data.replace("0x", ""));
      var index = 0;

      var line = "    " + event.abi_entry.name + "(";
      line += event.abi_entry.inputs.map(function(input) {
        var value;
        if (input.indexed == true) {
          value = "<indexed>";
        } else {
          value = values[index];
          index += 1;
        }

        return input.name + ": " + value.toString();
      }).join(", ");
      line += ")";
      self.logger.log(line);
    });
    self.logger.log(  "\n    ---------------------------");
    callback();
  });
};

TestRunner.prototype.snapshot = function(callback) {
  this.rpc("evm_snapshot", function(err, result) {
    if (err) return callback(err);
    callback(null, result.result);
  });
},

TestRunner.prototype.revert = function(snapshot_id, callback) {
  this.rpc("evm_revert", [snapshot_id], callback);
}

TestRunner.prototype.rpc = function(method, arg, cb) {
  var req = {
    jsonrpc: "2.0",
    method: method,
    id: new Date().getTime()
  };
  if (arguments.length == 3) {
    req.params = arg;
  } else {
    cb = arg;
  }

  var intermediary = function(err, result) {
    if (err != null) {
      cb(err);
      return;
    }

    if (result.error != null) {
      cb(new Error("RPC Error: " + (result.error.message || result.error)));
      return;
    }

    cb(null, result);
  };

  this.provider.sendAsync(req, intermediary);
};

var Test = {
  run: function(options, callback) {
    expect.options(options, [
      "contracts_directory",
      "contracts_build_directory",
      "migrations_directory",
      "test_files",
      "network",
      "network_id",
      "provider"
    ]);

    // Compile if needed. This will
    Contracts.compile({
      all: options.compileAll === true,
      contracts_directory: options.contracts_directory,
      contracts_build_directory: options.contracts_build_directory,
      network: options.network,
      network_id: options.network_id,
      quiet: false,
      quietWrite: true,
      strict: options.strict
    }, function(err) {
      if (err) return callback(err);

      // Override console.warn() because web3 outputs gross errors to it.
      // e.g., https://github.com/ethereum/web3.js/blob/master/lib/web3/allevents.js#L61
      // Output looks like this during tests: https://gist.github.com/tcoulter/1988349d1ec65ce6b958
      var warn = console.warn;
      console.warn = function(message) {
        if (message == "cannot find event for log") {
          return;
        } else {
          warn.apply(console, arguments);
        }
      };

      // `accounts` will be populated before each contract() invocation
      // and passed to it so tests don't have to call it themselves.
      var web3 = new Web3();
      web3.setProvider(options.provider);

      web3.eth.getAccounts(function(err, accounts) {
        if (err) return callback(err);

        global.web3 = web3;
        global.assert = chai.assert;

        var runner = new TestRunner(options);

        global.contract = function(name, tests) {
          if (typeof opts == "function") {
            tests = name;
            name = "";
          }

          describe("Contract: " + name, function() {
            this.timeout(TEST_TIMEOUT);

            before("prepare suite", function(done) {
              this.timeout(BEFORE_TIMEOUT);
              runner.initialize(done);
            });

            beforeEach("before test", function(done) {
              runner.startTest(this, done);
            });

            afterEach("after test", function(done) {
              runner.endTest(this, done);
            });

            tests(accounts);
          });
        };

        var mocha = new Mocha(options.mocha || {
          useColors: true
        });

        // // Change current working directory to that of the project.
        // process.chdir(config.working_dir);
        // __dirname = process.cwd();

        options.test_files.forEach(function(file) {
          mocha.addFile(file);
        });

        process.on('unhandledRejection', function(reason, p) {
          throw reason;
        });

        mocha.run(function(failures) {
          console.warn = warn;
          callback(failures);
        });
      });
    });
  }
};

module.exports = Test;
