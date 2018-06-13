var Web3 = require("web3");
var Config = require("truffle-config");
var Migrate = require("truffle-migrate");
var TestResolver = require("./testresolver");
var TestSource = require("./testsource");
var expect = require("truffle-expect");
var contract = require("truffle-contract");
var SolidityCoder = require("web3/lib/solidity/coder.js");
var path = require("path");
var _ = require("lodash");
var async = require("async");
var fs = require("fs");

function TestRunner(options) {
  options = options || {};

  expect.options(options, [
    "resolver",
    "provider",
    "contracts_build_directory"
  ]);

  this.config = Config.default().merge(options);

  this.logger = options.logger || console;
  this.initial_resolver = options.resolver;
  this.provider = options.provider;

  this.can_snapshot = false;
  this.first_snapshot = true;
  this.initial_snapshot = null;
  this.known_events = {};
  this.web3 = new Web3();
  this.web3.setProvider(options.provider);

  // For each test
  this.currentTestStartBlock = null;

  this.BEFORE_TIMEOUT = 120000;
  this.TEST_TIMEOUT = 300000;
};

TestRunner.prototype.initialize = function(callback) {
  var self = this;

  var test_source = new TestSource(self.config);
  this.config.resolver = new TestResolver(self.initial_resolver, test_source, self.config.contracts_build_directory);

  var afterStateReset = function(err) {
    if (err) return callback(err);

    fs.readdir(self.config.contracts_build_directory, function(err, files) {
      if (err) return callback(err);

      files = _.filter(files, function(file) {
        return path.extname(file) === ".json"
      });

      async.map(files, function(file, finished) {
        fs.readFile(path.join(self.config.contracts_build_directory, file), "utf8", finished);
      }, function(err, data) {
        if (err) return callback(err);

        var contracts = data.map(JSON.parse).map(contract);
        var abis = _.flatMap(contracts, "abi");

        abis.map(function(abi) {
          if (abi.type == "event") {
            var signature = abi.name + "(" + _.map(abi.inputs, "type").join(",") + ")";
            self.known_events[web3.sha3(signature)] = {
              signature: signature,
              abi_entry: abi
            };
          }
        });
        callback();
      });
    });
  };

  if (self.first_snapshot) {
    // // Make the initial deployment (full migration).
    // self.deploy(function(err) {
    //   if (err) return callback(err);

    self.snapshot(function(err, initial_snapshot) {
      if (err == null) {
        self.can_snapshot = true;
        self.initial_snapshot = initial_snapshot;
      }

      self.first_snapshot = false;

      afterStateReset();
    });
    //});
  } else {
    self.resetState(afterStateReset);
  }
};

TestRunner.prototype.deploy = function(callback) {
  Migrate.run(this.config.with({
    reset: true,
    quiet: true
  }), callback);
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

module.exports = TestRunner;
