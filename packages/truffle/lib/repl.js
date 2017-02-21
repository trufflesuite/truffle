var repl = require("repl");
var Command = require("./command");
var provision = require("truffle-provisioner");
var contract = require("truffle-contract");
var Web3 = require("web3");
var vm = require("vm");
var expect = require("truffle-expect");
var _ = require("lodash");
var TruffleError = require("truffle-error");
var fs = require("fs");
var path = require("path");

function TruffleInterpreter(tasks, options) {
  this.options = options;
  this.r = null;
  this.command = new Command(tasks);
};

TruffleInterpreter.prototype.start = function() {
  var self = this;
  var options = this.options;

  var web3 = new Web3();
  web3.setProvider(options.provider);

  this.provision(function(err, abstractions) {
    if (err) {
      options.logger.log("Unexpected error: Cannot provision contracts while instantiating the console.");
      options.logger.log(err.stack || err.message || err);
    }

    var prefix = "truffle(" + options.network + ")> ";

    try {
      self.r = repl.start({
        prompt: prefix,
        eval: self.interpret.bind(self)
      });

      self.r.on("exit", function() {
        process.exit(1);
      });

      self.resetContractsInConsoleContext(abstractions);
      self.r.context.web3 = web3;

    } catch(e) {
      console.log(e.stack);
      process.exit(1);
    }
  });
};

TruffleInterpreter.prototype.provision = function(callback) {
  var self = this;

  fs.readdir(this.options.contracts_build_directory, function(err, files) {
    if (err) {
      // Error reading the build directory? Must mean it doesn't exist or we don't have access to it.
      // Couldn't provision the contracts if we wanted. It's possible we're hiding very rare FS
      // errors, but that's better than showing the user error messages that will be "build folder
      // doesn't exist" 99.9% of the time.
    }

    var promises = [];
    files = files || [];

    files.forEach(function(file) {
      promises.push(new Promise(function(accept, reject) {
        fs.readFile(path.join(self.options.contracts_build_directory, file), "utf8", function(err, body) {
          if (err) return reject(err);
          try {
            body = JSON.parse(body);
          } catch (e) {
            return reject(new Error("Cannot parse " + file + ": " + e.message));
          }

          accept(body);
        })
      }))
    });

    Promise.all(promises).then(function(json_blobs) {
      var abstractions = json_blobs.map(function(json) {
        var abstraction = contract(json);
        provision(abstraction, self.options);
        return abstraction;
      });

      self.resetContractsInConsoleContext(abstractions);

      callback(null, abstractions);
    }).catch(callback);
  });
};

TruffleInterpreter.prototype.resetContractsInConsoleContext = function(abstractions) {
  var self = this;

  abstractions = abstractions || []

  if (this.r != null) {
    abstractions.forEach(function(abstraction) {
      self.r.context[abstraction.contract_name] = abstraction;
    });
  }
}

TruffleInterpreter.prototype.interpret = function(cmd, context, filename, callback) {
  var self = this;

  if (this.command.getCommand(cmd.trim()) != null) {
    return this.command.run(cmd.trim(), this.options, function(err) {
      if (err) {
        // Perform error handling ourselves.
        if (err instanceof TruffleError) {
          console.log(err.message);
        } else {
          // Bubble up all other unexpected errors.
          console.log(err.stack || err.toString());
        }
        return callback();
      }

      // Reprovision after each command as it may change contracts.
      self.provision(function(err, abstractions) {
        // Don't pass abstractions to the callback if they're there or else
        // they'll get printed in the repl.
        callback(err);
      });
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
      "resolver",
      "build_directory"
    ]);

    var interpreter = new TruffleInterpreter(tasks, options);
    interpreter.start();
  }
}

module.exports = Repl;
