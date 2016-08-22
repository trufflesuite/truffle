var repl = require("repl");
var Command = require("./command");
var Contracts = require("./contracts");
var Web3 = require("web3");
var vm = require("vm");
var expect = require("./expect");
var _ = require("lodash");
var ExtendableError = require("./errors/extendableerror");

function TruffleInterpreter(tasks, options) {
  this.options = options;
  this.contracts = [];
  this.r = null;
  this.command = new Command(tasks);
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

TruffleInterpreter.prototype.interpret = function(cmd, context, filename, callback) {
  var self = this;

  if (this.command.getTask(cmd.trim()) != null) {
    return this.command.run(cmd.trim(), this.options, function(err) {
      if (err) {
        // Perform error handling ourselves.
        if (err instanceof ExtendableError) {
          console.log(err.message);
        } else {
          // Bubble up all other unexpected errors.
          console.log(err.stack || err.toString());
        }
        return callback();
      }

      // Reprovision after each command is it may change contracts.
      self.provision(callback);
    });
  }

  var result;
  try {
    result = vm.runInContext(cmd, context, {
      displayErrors: false
    });
  } catch (e) {
    return callback(e);
  }

  // Resolve all promises. This will leave non-promises alone.
  Promise.resolve(result).then(function(res) { callback(null, res) }).catch(callback);
}

var Repl = {
  TruffleInterpreter: TruffleInterpreter,

  run: function(tasks, options) {
    var self = this;

    expect.options(options, [
      "working_directory",
      "contracts_directory",
      "contracts_build_directory",
      "migrations_directory",
      "network",
      "network_id",
      "provider",
      "builder",
      "build_directory",
      "rpc"
    ]);

    var interpreter = new TruffleInterpreter(tasks, options);
    interpreter.start();
  }
}

module.exports = Repl;
