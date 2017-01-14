var Web3 = require("web3");
var Config = require("truffle-config");
var Migrate = require("truffle-migrate");
var Deployer = require("truffle-deployer");
var Deployed = require("./deployed");
var TestResolver = require("./testresolver");
var TestSource = require("./testsource");
var series = require("async").series;
var provision = require("truffle-provisioner");
var find_contracts = require("truffle-contract-sources");
var artifactor = require("truffle-artifactor");
var expect = require("truffle-expect");
var compile = require("truffle-compile");

function TestRunner(options) {
  options = options || {};
  this.config = Config.default().merge(options);

  expect.options(options, [
    "resolver",
    "provider",
    "dependency_paths" // paths of all .sol dependencies (found through compilation)
  ]);

  this.logger = options.logger || console;
  this.initial_resolver = options.resolver;
  this.provider = options.provider;
  this.dependency_paths = options.dependency_paths;

  this.can_shapshot = false;
  this.initial_snapshot = null;
  this.known_events = {};
  this.web3 = new Web3();
  this.web3.setProvider(options.provider);

  // For each test
  this.currentTestStartBlock = null;
};

TestRunner.prototype.initialize = function(callback) {
  var self = this;

  var test_source = new TestSource(self.config);
  this.config.resolver = new TestResolver(self.initial_resolver, test_source);

  var afterStateReset = function(err) {
    if (err) return callback(err);

    callback();

    //self.known_events = {};

    // Go through all abis and record events we know about.
    // self.project_contracts.forEach(function(contract) {
    //   // make the contract globally available
    //   global[contract.contract_name] = contract;
    //
    //   var abi = contract.abi;
    //
    //   for (var j = 0; j < abi.length; j++) {
    //     var item = abi[j];
    //
    //     if (item.type == "event") {
    //       var signature = item.name + "(" + item.inputs.map(function(param) {return param.type;}).join(",") + ")";
    //
    //       self.known_events[web3.sha3(signature)] = {
    //         signature: signature,
    //         abi_entry: item
    //       };
    //     }
    //   }
    //
    //   callback();
    // });

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

TestRunner.prototype.initializeSolidityTest = function(contract, callback) {
  var self = this;

  series([
    this.initialize.bind(this),
    this.compileNewAbstractInterface.bind(this),
  ], function(err) {
    if (err) return callback(err);

    var deployer = new Deployer(self.config.with({
      logger: { log: function() {} }
    }));

    var Assert = self.config.resolver.require("truffle/Assert.sol");
    var DeployedAddresses = self.config.resolver.require("truffle/DeployedAddresses.sol");

    deployer.deploy([
      Assert,
      DeployedAddresses
    ]).then(function() {
      self.dependency_paths.forEach(function(dependency_path) {
        var dependency = self.config.resolver.require(dependency_path);

        if (dependency.isDeployed()) {
          deployer.link(dependency, contract);
        }
      });
    });

    deployer.deploy(contract);

    deployer.start().then(function() {
      callback();
    }).catch(callback);
  });
};

TestRunner.prototype.compileNewAbstractInterface = function(callback) {
  var self = this;

  find_contracts(this.config.contracts_directory, function(err, files) {
    if (err) return callback(err);

    compile.with_dependencies(self.config.with({
      paths: [
        "truffle/DeployedAddresses.sol"
      ],
      quiet: true
    }), function(err, contracts) {
      if (err) return callback(err);

      // Set network values.
      Object.keys(contracts).forEach(function(name) {
        contracts[name].network_id = self.config.network_id;
        contracts[name].default_network = self.config.default_network;
      });

      artifactor.saveAll(contracts, self.config.contracts_build_directory).then(function() {
        callback();
      }).catch(callback);
    });
  });
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
