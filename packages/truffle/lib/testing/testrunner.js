var Web3 = require("web3");
var Migrate = require("../migrate");
var Compiler = require("../compiler");
var Config = require("../config");
var Deployer = require("../deployer");
var Profiler = require('../profiler');
var Deployed = require("./deployed");
var TestSource = require("./testsource");
var async = require("async");
var provision = require("truffle-provisioner");


function TestRunner(options) {
  this.config = Config.default().merge(options);
  this.logger = options.logger || console;
  this.provider = options.provider;
  this.can_shapshot = false;
  this.initial_snapshot = null;
  this.known_events = {};
  this.web3 = new Web3();
  this.web3.setProvider(options.provider);

  this.setContracts(options.contracts);

  // For each test
  this.currentTestStartBlock = null;
};

TestRunner.prototype.initialize = function(callback) {
  var self = this;

  var afterStateReset = function(err) {
    if (err) return callback(err);

    provision(self.config, function(err, contracts) {
      if (err) return callback(err);

      self.setContracts(contracts);

      self.known_events = {};

      // Go through all abis and record events we know about.
      self.project_contracts.forEach(function(contract) {
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

TestRunner.prototype.setContracts = function(contracts) {
  var self = this;

  self.contracts = contracts;
  self.project_contracts = [];
  self.test_contracts = [];
  self.test_dependencies = [];

  contracts.forEach(function(contract) {
    if (contract.contract_name.indexOf("Test") == 0) {
      self.test_contracts.push(contract);
    } else if (["DeployedAddresses", "Assert"].indexOf(contract.contract_name) >= 0) {
      self.test_dependencies.push(contract);
    } else {
      self.project_contracts.push(contract);
    }
  });
};


TestRunner.prototype.initializeSolidityTest = function(contract, callback) {
  var self = this;

  async.series([
    this.initialize.bind(this),
    this.compileNewAbstractInterface.bind(this),
    function(c) {
      var deployer = new Deployer(self.config.with({
        contracts: self.contracts,
        logger: {
          log: function() {}
        }
      }));

      deployer.deploy(self.test_dependencies);
      deployer.deploy(contract);
      deployer.start().then(function() {
        // Somehow this won't continue if I just pass c to .then()...
        c();
      }).catch(c);
    }
  ], callback)
};

TestRunner.prototype.compileNewAbstractInterface = function(callback) {
  var self = this;

  Profiler.all_contracts(this.config.contracts_directory, function(err, files) {
    if (err) return callback(err);

    var sources = [new TestSource(files, self.project_contracts)].concat(self.config.sources);

    Compiler.compile_with_dependencies(self.config.with({
      paths: [
        "truffle/DeployedAddresses.sol"
      ],
      sources: sources,
      quiet: true
    }), function(err, contracts) {
      if (err) return callback(err);

      for (var i = 0; i < self.contracts.length; i++) {
        var needle = self.contracts[i];
        if (needle.contract_name == "DeployedAddresses") {
          needle.unlinked_binary = "0x" + contracts["DeployedAddresses"].bytecode;
          break;
        }
      }

      callback();
    });
  });
};

TestRunner.prototype.deploy = function(callback) {
  Migrate.run({
    migrations_directory: this.config.migrations_directory,
    contracts_build_directory: this.config.contracts_build_directory,
    contracts: this.project_contracts, // Use project contracts to prevent linker from trying to link everything
    network: this.config.network,
    network_id: this.config.network_id,
    provider: this.config.provider,
    rpc: this.config.rpc,
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

module.exports = TestRunner;
