var repl = require("repl");
var Contracts = require("./contracts");
var Migrate = require("./migrate");
var Build = require("./build");
var Web3 = require("web3");
var vm = require("vm");

function TruffleInterpreter(options) {
  this.options = options;
  this.contracts = [];
  this.r = null;
};

TruffleInterpreter.prototype.start = function() {
  var self = this;
  var options = this.options;

  var web3 = new Web3();
  web3.setProvider(options.provider);

  this.provision(function(err) {
    if (err) return done(err);

    var prefix = "truffle(default)> ";

    if (options.network != null && options.network != "default") {
      prefix = "truffle(" + options.network + ")> ";
    }

    try {
      self.r = repl.start({
        prompt: prefix,
        eval: self.interpret.bind(self)
      });

      self.r.on("exit", function() {
        process.exit(1);
      });

      self.resetContracts();
      self.r.context.web3 = web3;

    } catch(e) {
      console.log(e.stack);
      process.exit(1);
    }
  });
};

TruffleInterpreter.prototype.provision = function(callback) {
  var self = this;
  Contracts.provision(this.options, function(err, contracts) {
    if (err) return callback(err);

    self.contracts = contracts;
    self.resetContracts();

    callback();
  });
};

TruffleInterpreter.prototype.resetContracts = function() {
  var self = this;

  if (this.r != null) {
    this.contracts.forEach(function(contract) {
      self.r.context[contract.contract_name] = contract;
    });
  }
}

TruffleInterpreter.prototype.compile = function(all, callback) {
  var options = this.options;

  if (typeof all == "function") {
    callback = all;
    all = false;
  }

  Contracts.compile({
    all: !!all,
    source_directory: options.contracts_directory,
    contracts_build_directory: options.contracts_build_directory
  }, callback);
};

TruffleInterpreter.prototype.migrate = function(reset, callback) {
  var options = this.options;

  if (typeof reset == "function") {
    callback = reset;
    reset = false;
  }

  this.compile(false, function(err) {
    if (err) return callback(err);

    Migrate.run({
      migrations_directory: options.migrations_directory,
      contracts_build_directory: options.contracts_build_directory,
      provider: options.provider,
      reset: !!reset
    }, function(err) {
      console.log("");
      callback(err);
    });
  });
};

TruffleInterpreter.prototype.build = function(callback) {
  var options = this.options;

  Build.build({
    builder: options.builder,
    build_directory: options.build_directory,
    working_directory: options.working_directory,
    contracts_build_directory: options.contracts_build_directory,
    processors: options.processors, // legacy option for default builder
    provider: options.provider,
    rpc: options.rpc
  }, callback);
};

TruffleInterpreter.prototype.interpret = function(cmd, context, filename, callback) {
  switch (cmd.trim()) {
    case "compile":
      return this.compile(callback);
    case "migrate":
      return this.migrate(callback);
    case "build":
      return this.build(callback);
  }

  var result;
  try {
    result = vm.runInContext(cmd, context, {
      displayErrors: false
    });
  } catch (e) {
    return callback(e);
  }
  callback(null, result);
}

var Repl = {
  TruffleInterpreter: TruffleInterpreter,

  run: function(options) {
    var self = this;

    var interpreter = new TruffleInterpreter(options);
    interpreter.start();
  }
}

module.exports = Repl;
